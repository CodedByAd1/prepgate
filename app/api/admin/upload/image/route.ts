import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BUCKET = "question-images";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "your_service_role_key_here") return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * POST /api/admin/upload/image
 * Multipart: { image: File, questionId: string }
 * Returns: { imageUrl }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json(
      { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured in .env" },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file       = formData.get("image") as File | null;
  const questionId = formData.get("questionId") as string | null;

  if (!file)       return Response.json({ error: "No image file provided" }, { status: 400 });
  if (!questionId) return Response.json({ error: "questionId is required" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: "Only JPEG, PNG, WebP, GIF images are supported" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return Response.json({ error: "Image must be under 5 MB" }, { status: 413 });
  }

  // ── Ensure bucket exists ──────────────────────────────────────────────────
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }

  // ── Build a unique path ───────────────────────────────────────────────────
  const ext  = file.type.split("/")[1];
  const path = `${questionId}/${Date.now()}.${ext}`;

  // ── Upload ────────────────────────────────────────────────────────────────
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 502 });
  }

  // ── Get public URL ────────────────────────────────────────────────────────
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // ── Persist to question record ────────────────────────────────────────────
  await prisma.question.updateMany({
    where: { id: questionId, deletedAt: null },
    data:  { imageUrl: publicUrl },
  });

  return Response.json({ imageUrl: publicUrl });
}
