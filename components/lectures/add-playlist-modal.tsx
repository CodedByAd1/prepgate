"use client";

import { useState } from "react";
import { X, Link2, User, BookOpen, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SUBJECT_META } from "@/types";
import { Subject } from "@prisma/client";

interface AddPlaylistModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddPlaylistModal({ onClose, onAdded }: AddPlaylistModalProps) {
  const [url, setUrl] = useState("");
  const [instructor, setInstructor] = useState("");
  const [subject, setSubject] = useState<Subject | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: url,
          instructor,
          subject,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setSuccess(`"${data.playlist.title}" added successfully!`);
      setTimeout(() => {
        onAdded();
        onClose();
      }, 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-up rounded-2xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Add YouTube Playlist</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste a YouTube playlist URL to save it to the Lecture Hub
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                YouTube Playlist URL <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/playlist?list=PL..."
                  required
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>

            {/* Instructor */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Instructor Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="e.g. Abdul Bari, Saurabh Shukla"
                  required
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Subject <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as Subject)}
                  required
                  className="w-full appearance-none rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                >
                  <option value="" disabled>Select a subject…</option>
                  {Object.entries(SUBJECT_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 rounded-lg border border-green-500/20 bg-green-500/8 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !!success}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching…
                  </>
                ) : (
                  "Add Playlist"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
