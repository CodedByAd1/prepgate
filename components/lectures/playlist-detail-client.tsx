"use client";

import { useState, useCallback } from "react";
import { VideoCard } from "@/components/lectures/video-card";
import { SUBJECT_META } from "@/types";
import { Subject } from "@prisma/client";
import {
  ArrowLeft,
  RefreshCw,
  User,
  PlayCircle,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { formatDuration } from "@/lib/youtube";

interface VideoWithProgress {
  id: string;
  youtubeVideoId: string;
  title: string;
  thumbnail: string | null;
  duration: number;
  orderIndex: number;
  progress: { completed: boolean }[];
}

interface PlaylistDetailClientProps {
  playlistId: string;
  title: string;
  youtubePlaylistId: string;
  thumbnail: string | null;
  instructor: string;
  subject: Subject;
  description: string | null;
  totalVideos: number;
  initialVideos: VideoWithProgress[];
}

export function PlaylistDetailClient({
  playlistId,
  title,
  youtubePlaylistId,
  thumbnail,
  instructor,
  subject,
  description,
  totalVideos,
  initialVideos,
}: PlaylistDetailClientProps) {
  const subjectMeta = SUBJECT_META[subject];

  // ── State ──────────────────────────────────────────────────────────────────
  const [videos, setVideos] = useState<VideoWithProgress[]>(initialVideos);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "remaining">("all");

  // ── Derived stats ──────────────────────────────────────────────────────────
  const completedCount = videos.filter((v) => v.progress[0]?.completed).length;
  const remainingCount = videos.length - completedCount;
  const progressPct =
    videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;
  const totalDurationSecs = videos.reduce((a, v) => a + v.duration, 0);

  // ── Toggle video progress (optimistic update) ──────────────────────────────
  const handleToggle = useCallback((videoId: string, newState: boolean) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? { ...v, progress: [{ completed: newState }] }
          : v
      )
    );
  }, []);

  // ── Sync videos from YouTube ───────────────────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError("");
    try {
      const res = await fetch(`/api/playlists/${playlistId}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error ?? "Sync failed");
        return;
      }
      // Refresh video list
      const refresh = await fetch(`/api/playlists/${playlistId}`);
      const refreshData = await refresh.json();
      if (refreshData.playlist?.videos) {
        setVideos(refreshData.playlist.videos);
      }
    } catch {
      setSyncError("Network error. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Filtered videos ────────────────────────────────────────────────────────
  const filteredVideos = videos.filter((v) => {
    if (filter === "completed") return v.progress[0]?.completed;
    if (filter === "remaining") return !v.progress[0]?.completed;
    return true;
  });

  const playlistUrl = `https://youtube.com/playlist?list=${youtubePlaylistId}`;

  return (
    <div className="space-y-6">
      {/* ── Back link ── */}
      <Link
        href="/lectures"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lecture Hub
      </Link>

      {/* ── Playlist header card ── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:gap-6 sm:p-6">
          {/* Thumbnail */}
          <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-56">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center gradient-brand">
                <PlayCircle className="h-12 w-12 text-white/60" />
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-1 flex-col gap-2.5">
            {/* Subject tag */}
            <div
              className="badge-subject inline-flex w-fit"
              style={{
                background: `${subjectMeta.color}18`,
                color: subjectMeta.color,
              }}
            >
              {subjectMeta.label}
            </div>

            <h1 className="text-xl font-bold leading-snug text-foreground sm:text-2xl">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {instructor}
              </span>
              <span className="flex items-center gap-1.5">
                <PlayCircle className="h-4 w-4" />
                {videos.length} videos
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(totalDurationSecs)}
              </span>
            </div>

            {description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:bg-muted"
              >
                <PlayCircle className="h-3.5 w-3.5 text-red-500" />
                Open in YouTube
              </a>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:bg-muted disabled:opacity-60"
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {isSyncing ? "Syncing…" : "Sync Videos"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div className="border-t border-border px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="font-medium">Your Progress</span>
            <span className="font-semibold text-foreground">{progressPct}%</span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: progressPct === 100
                  ? "hsl(142 71% 45%)"
                  : `linear-gradient(90deg, ${subjectMeta.color}, hsl(168 72% 42%))`,
              }}
            />
          </div>
          {/* Stats row */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: videos.length, icon: BookOpen, color: "text-muted-foreground" },
              { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-green-500" },
              { label: "Remaining", value: remainingCount, icon: Clock, color: "text-amber-500" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 py-2.5">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-lg font-bold text-foreground">{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sync error ── */}
      {syncError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {syncError}
        </div>
      )}

      {/* ── Video list ── */}
      <div className="space-y-3">
        {/* Filter tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {(["all", "remaining", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all duration-150 ${
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f} {f === "completed" ? `(${completedCount})` : f === "remaining" ? `(${remainingCount})` : `(${videos.length})`}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredVideos.length} video{filteredVideos.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Videos */}
        {videos.length === 0 ? (
          // No videos synced yet
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
            <PlayCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No videos synced yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Click <strong>Sync Videos</strong> above to import all videos from this YouTube playlist.
            </p>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="mt-5 inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90 disabled:opacity-60"
            >
              {isSyncing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Syncing…</>
              ) : (
                <><RefreshCw className="h-4 w-4" />Sync Videos Now</>
              )}
            </button>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 py-12 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-foreground">
              {filter === "completed" ? "No completed videos yet" : "All videos completed! 🎉"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                youtubeVideoId={video.youtubeVideoId}
                title={video.title}
                thumbnail={video.thumbnail}
                duration={video.duration}
                orderIndex={video.orderIndex}
                completed={video.progress[0]?.completed ?? false}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
