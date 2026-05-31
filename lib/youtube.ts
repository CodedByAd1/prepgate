// ─── YouTube API helpers ────────────────────────────────────────────────────

/** Parse ISO 8601 duration (PT1H30M45S) → total seconds */
export function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

/** Format seconds → "MM:SS" or "H:MM:SS" */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface PlaylistItem {
  videoId: string;
  title: string;
  thumbnail: string | null;
  position: number;
}

interface VideoDetail {
  videoId: string;
  durationSecs: number;
}

/** Fetch ALL items from a YouTube playlist (handles pagination) */
export async function fetchPlaylistItems(
  playlistId: string,
  apiKey: string
): Promise<PlaylistItem[]> {
  const items: PlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems"
    );
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch playlist items");

    const data = await res.json();
    pageToken = data.nextPageToken;

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      // Skip deleted/private videos
      if (!snippet?.resourceId?.videoId) continue;
      if (snippet.title === "Deleted video" || snippet.title === "Private video") continue;

      items.push({
        videoId: snippet.resourceId.videoId as string,
        title: snippet.title as string,
        thumbnail:
          (snippet.thumbnails?.high?.url as string) ||
          (snippet.thumbnails?.medium?.url as string) ||
          (snippet.thumbnails?.default?.url as string) ||
          null,
        position: snippet.position as number,
      });
    }
  } while (pageToken);

  return items;
}

/** Fetch durations for a batch of video IDs (max 50 per call) */
export async function fetchVideoDurations(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, number>> {
  const durations = new Map<string, number>();

  // YouTube allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) continue;

    const data = await res.json();
    for (const item of data.items ?? []) {
      const secs = parseDuration(item.contentDetails?.duration ?? "PT0S");
      durations.set(item.id as string, secs);
    }
  }

  return durations;
}
