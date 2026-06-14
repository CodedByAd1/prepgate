import { supabaseAdmin, BUCKETS } from "@/lib/supabase";

/**
 * Upload a PDF buffer to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadPdf(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const path = `originals/${Date.now()}_${fileName.replace(/\s+/g, "_")}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKETS.PDF_IMPORTS)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) throw new Error(`Failed to upload PDF: ${error.message}`);

  const { data } = supabaseAdmin.storage
    .from(BUCKETS.PDF_IMPORTS)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload a page PNG buffer to Supabase Storage.
 */
export async function uploadPageImage(
  importId: string,
  pageNumber: number,
  buffer: Buffer
): Promise<string> {
  const path = `${importId}/pages/page_${pageNumber}.png`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKETS.PAGE_IMAGES)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload page image: ${error.message}`);

  const { data } = supabaseAdmin.storage
    .from(BUCKETS.PAGE_IMAGES)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Upload a cropped question/diagram image to Supabase Storage.
 */
export async function uploadQuestionImage(
  importId: string,
  questionId: string,
  buffer: Buffer
): Promise<string> {
  const path = `${importId}/questions/${questionId}.png`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKETS.QUESTION_IMAGES)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error)
    throw new Error(`Failed to upload question image: ${error.message}`);

  const { data } = supabaseAdmin.storage
    .from(BUCKETS.QUESTION_IMAGES)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Download a file from Supabase Storage by its public URL.
 * Returns a Buffer.
 */
export async function downloadFromStorage(publicUrl: string): Promise<Buffer> {
  // Extract the path relative to the bucket from the URL
  const url = new URL(publicUrl);
  // URL pattern: .../storage/v1/object/public/<bucket>/<path>
  const pathParts = url.pathname.split("/storage/v1/object/public/");
  if (pathParts.length < 2) throw new Error("Invalid Supabase Storage URL");

  const [bucketAndPath] = pathParts[1].split(/\/(.*)/);
  const bucket = bucketAndPath;
  const filePath = pathParts[1].slice(bucket.length + 1);

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(filePath);

  if (error) throw new Error(`Failed to download file: ${error.message}`);

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Ensure all required buckets exist (idempotent).
 * Call this during bootstrap/setup.
 */
export async function ensureBucketsExist(): Promise<void> {
  const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets();
  const existingNames = new Set(existingBuckets?.map((b) => b.name) ?? []);

  for (const bucket of Object.values(BUCKETS)) {
    if (!existingNames.has(bucket)) {
      await supabaseAdmin.storage.createBucket(bucket, { public: true });
    }
  }
}
