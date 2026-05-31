import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchPlaylistItems, fetchVideoDurations } from "@/lib/youtube";
import { Subject } from "@prisma/client";

/**
 * POST /api/playlists/[id]/sync
 * Fetches all videos from the YouTube playlist and upserts them into the DB.
 * Idempotent — safe to call multiple times.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) {
    return Response.json({ error: "Playlist not found" }, { status: 404 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "YOUTUBE_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  // 1. Fetch all playlist items from YouTube
  const items = await fetchPlaylistItems(playlist.youtubePlaylistId, apiKey);
  if (items.length === 0) {
    return Response.json({ synced: 0, message: "No public videos found." });
  }

  // 2. Fetch durations for all video IDs in parallel batches
  const videoIds = items.map((i) => i.videoId);
  const durations = await fetchVideoDurations(videoIds, apiKey);

  // 3. Upsert each video — createMany with skipDuplicates for efficiency
  const videoData = items.map((item) => ({
    youtubeVideoId: item.videoId,
    title: item.title,
    thumbnail: item.thumbnail,
    duration: durations.get(item.videoId) ?? 0,
    orderIndex: item.position,
    playlistId: id,
    subject: playlist.subject as Subject,
  }));

  await prisma.$transaction([
    // Upsert videos (createMany skips conflicts on unique youtubeVideoId)
    prisma.video.createMany({
      data: videoData,
      skipDuplicates: true,
    }),
    // Update totalVideos count on playlist
    prisma.playlist.update({
      where: { id },
      data: { totalVideos: items.length },
    }),
  ]);

  return Response.json({ synced: items.length });
}
