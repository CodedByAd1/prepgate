"use client";

import { useState, useCallback } from "react";
import { Plus, Search, SlidersHorizontal, BookOpen, Inbox } from "lucide-react";
import { PlaylistCard } from "@/components/lectures/playlist-card";
import { AddPlaylistModal } from "@/components/lectures/add-playlist-modal";
import { SUBJECT_META } from "@/types";
import { Subject } from "@prisma/client";

type Playlist = {
  id: string;
  title: string;
  youtubePlaylistId: string;
  thumbnail: string | null;
  instructor: string;
  totalVideos: number;
  subject: Subject;
};

interface LecturesClientProps {
  initialPlaylists: Playlist[];
}

const SUBJECTS = Object.entries(SUBJECT_META).map(([key, meta]) => ({
  value: key as Subject,
  label: meta.shortLabel,
  color: meta.color,
}));

export function LecturesClient({ initialPlaylists }: LecturesClientProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState<Subject | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filtered = playlists.filter((p) => {
    const matchSubject =
      activeSubject === "ALL" || p.subject === activeSubject;
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.instructor.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  // ── Refresh list from server ───────────────────────────────────────────────
  const refreshPlaylists = useCallback(async () => {
    const res = await fetch("/api/playlists");
    const data = await res.json();
    if (data.playlists) setPlaylists(data.playlists);
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Remove this playlist from the Lecture Hub?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lecture Hub</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {playlists.length > 0
              ? `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""} · ${playlists.reduce((a, p) => a + p.totalVideos, 0)} total videos`
              : "Add your first YouTube playlist to get started"}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Add Playlist
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search playlists or instructors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
        />
      </div>

      {/* ── Subject filter pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="font-medium">Filter:</span>
        </div>

        {/* ALL pill */}
        <button
          onClick={() => setActiveSubject("ALL")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
            activeSubject === "ALL"
              ? "gradient-brand text-white shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          All Subjects
        </button>

        {SUBJECTS.map((s) => (
          <button
            key={s.value}
            onClick={() =>
              setActiveSubject(
                activeSubject === s.value ? "ALL" : s.value
              )
            }
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
              activeSubject === s.value
                ? "text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
            style={
              activeSubject === s.value
                ? { background: s.color }
                : undefined
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Results count ── */}
      {search || activeSubject !== "ALL" ? (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {playlists.length} playlists
        </p>
      ) : null}

      {/* ── Grid ── */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((playlist) => (
            <div
              key={playlist.id}
              className={
                deletingId === playlist.id
                  ? "opacity-50 pointer-events-none"
                  : ""
              }
            >
              <PlaylistCard
                {...playlist}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        // ── Empty state (no playlists at all) ──
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-brand mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            No playlists yet
          </h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Add your first YouTube playlist by clicking{" "}
            <strong>Add Playlist</strong> above. Paste any YouTube playlist URL
            and it will be saved here.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-all duration-200 hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add First Playlist
          </button>
        </div>
      ) : (
        // ── No results for filter/search ──
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/50 px-8 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No playlists match your filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term or subject filter.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setActiveSubject("ALL");
            }}
            className="mt-4 text-xs font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Add Playlist Modal ── */}
      {showModal && (
        <AddPlaylistModal
          onClose={() => setShowModal(false)}
          onAdded={refreshPlaylists}
        />
      )}
    </div>
  );
}
