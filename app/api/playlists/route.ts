import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Subject } from "@prisma/client";
import { z } from "zod";

// ─── YouTube playlist ID extraction ───────────────────────────────────────────
function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    // Standard: youtube.com/playlist?list=PLxxxx
    const listParam = u.searchParams.get("list");
    if (listParam) return listParam;
    // Short form: youtu.be — not valid for playlists, but handle anyway
    return null;
  } catch {
    // Maybe they pasted just the ID
    if (/^PL[a-zA-Z0-9_-]{10,}/.test(url.trim())) return url.trim();
    return null;
  }
}

// ─── YouTube Data API call ────────────────────────────────────────────────────
async function fetchYouTubePlaylist(playlistId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) throw new Error("YouTube API request failed");

  const data = await res.json();
  if (!data.items || data.items.length === 0)
    throw new Error("Playlist not found. Check the URL and try again.");

  const item = data.items[0];
  return {
    title: item.snippet.title as string,
    thumbnail:
      (item.snippet.thumbnails?.high?.url as string) ||
      (item.snippet.thumbnails?.medium?.url as string) ||
      (item.snippet.thumbnails?.default?.url as string) ||
      null,
    channelTitle: item.snippet.channelTitle as string,
    totalVideos: item.contentDetails.itemCount as number,
    description: item.snippet.description as string | null,
  };
}

// ─── Validation ────────────────────────────────────────────────────────────────
const CreatePlaylistSchema = z.object({
  youtubeUrl: z.string().url("Please enter a valid YouTube URL"),
  instructor: z.string().min(1, "Instructor name is required"),
  subject: z.nativeEnum(Subject, { message: "Please select a subject" }),
});

// ─── GET /api/playlists ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const subject = searchParams.get("subject") ?? "";

  const playlists = await prisma.playlist.findMany({
    where: {
      isPublished: true,
      ...(subject && subject !== "ALL"
        ? { subject: subject as Subject }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { instructor: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ playlists });
}

// ─── POST /api/playlists ───────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CreatePlaylistSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { youtubeUrl, instructor, subject } = parsed.data;

  // Extract playlist ID
  const playlistId = extractPlaylistId(youtubeUrl);
  if (!playlistId) {
    return Response.json(
      { error: "Could not extract playlist ID from URL. Use a YouTube playlist URL (contains ?list=...)" },
      { status: 400 }
    );
  }

  // Check if already saved
  const existing = await prisma.playlist.findUnique({
    where: { youtubePlaylistId: playlistId },
  });
  if (existing) {
    return Response.json(
      { error: "This playlist is already saved." },
      { status: 409 }
    );
  }

  // Fetch from YouTube API
  let ytData;
  try {
    ytData = await fetchYouTubePlaylist(playlistId);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch playlist" },
      { status: 502 }
    );
  }

  // Save to database
  const playlist = await prisma.playlist.create({
    data: {
      youtubePlaylistId: playlistId,
      title: ytData.title,
      thumbnail: ytData.thumbnail,
      instructor,
      subject,
      totalVideos: ytData.totalVideos,
      description: ytData.description,
      isPublished: true,
    },
  });

  return Response.json({ playlist }, { status: 201 });
}
