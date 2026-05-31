import { ExternalLink, PlayCircle, Trash2, User } from "lucide-react";
import { SUBJECT_META } from "@/types";
import { Subject } from "@prisma/client";
import Link from "next/link";

interface PlaylistCardProps {
  id: string;
  title: string;
  youtubePlaylistId: string;
  thumbnail: string | null;
  instructor: string;
  totalVideos: number;
  subject: Subject;
  onDelete?: (id: string) => void;
}

export function PlaylistCard({
  id,
  title,
  youtubePlaylistId,
  thumbnail,
  instructor,
  totalVideos,
  subject,
  onDelete,
}: PlaylistCardProps) {
  const subjectMeta = SUBJECT_META[subject];
  const playlistUrl = `https://youtube.com/playlist?list=${youtubePlaylistId}`;

  return (
    <div className="stat-card group relative flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <Link
        href={`/lectures/${id}`}
        className="relative shrink-0 overflow-hidden rounded-t-[calc(var(--radius-lg)-1px)]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center gradient-brand">
              <PlayCircle className="h-12 w-12 text-white/60" />
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg transition-transform duration-200 hover:scale-110">
              <PlayCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>

          {/* Video count badge */}
          <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {totalVideos} videos
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Subject tag */}
        <div
          className="badge-subject inline-flex w-fit"
          style={{
            background: `${subjectMeta.color}18`,
            color: subjectMeta.color,
          }}
        >
          {subjectMeta.shortLabel}
        </div>

        {/* Title */}
        <Link href={`/lectures/${id}`} className="hover:text-primary transition-colors">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {title}
          </h3>
        </Link>

        {/* Instructor */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{instructor}</span>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium text-foreground transition-all duration-150 hover:border-primary/40 hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in YouTube
          </a>
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all duration-150 hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive"
              aria-label="Delete playlist"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
