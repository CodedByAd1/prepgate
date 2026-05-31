"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Clock, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/youtube";

interface VideoCardProps {
  id: string;
  youtubeVideoId: string;
  title: string;
  thumbnail: string | null;
  duration: number; // seconds
  orderIndex: number;
  completed: boolean;
  onToggle: (videoId: string, newState: boolean) => void;
}

export function VideoCard({
  id,
  youtubeVideoId,
  title,
  thumbnail,
  duration,
  orderIndex,
  completed,
  onToggle,
}: VideoCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const videoUrl = `https://youtube.com/watch?v=${youtubeVideoId}`;

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      const res = await fetch(`/api/progress/${id}`, { method: "PATCH" });
      if (res.ok) {
        onToggle(id, !completed);
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm ${
        completed
          ? "border-green-500/20 bg-green-500/5"
          : "border-border bg-card hover:border-border/80"
      }`}
    >
      {/* Order number / completed icon */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50"
        aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {isToggling ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
        )}
      </button>

      {/* Thumbnail */}
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative shrink-0 overflow-hidden rounded-lg"
        aria-label={`Watch: ${title}`}
      >
        <div className="relative h-16 w-28 overflow-hidden rounded-lg bg-muted sm:h-[72px] sm:w-32">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={title}
              className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
                completed ? "opacity-60" : ""
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center gradient-brand opacity-60" />
          )}
          {/* Duration badge */}
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
            {formatDuration(duration)}
          </span>
        </div>
      </a>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Position */}
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          #{orderIndex + 1}
        </span>

        {/* Title */}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`line-clamp-2 text-sm font-medium leading-snug transition-colors hover:text-primary ${
            completed ? "text-muted-foreground line-through-subtle" : "text-foreground"
          }`}
        >
          {title}
        </a>

        {/* Meta row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </div>

          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            Watch
          </a>

          {completed && (
            <span className="text-xs font-medium text-green-500">
              ✓ Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
