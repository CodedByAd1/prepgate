"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Calendar,
  BookOpen,
  ExternalLink,
  Download,
  X,
  Loader2,
  AlertCircle,
  Eye,
  Layers,
  CheckCircle2,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Paper {
  id: string;
  fileName: string;
  displayTitle: string;
  storageUrl: string;
  year: number | null;
  totalPages: number;
  questionCount: number;
  approvedCount: number;
  createdAt: string;
}

// ─── PDF Viewer Modal ──────────────────────────────────────────────────────────
function PdfViewerModal({
  paper,
  onClose,
}: {
  paper: Paper;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "hsl(222 26% 7% / 0.92)", backdropFilter: "blur(6px)" }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
        }}
      >
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {paper.displayTitle}
          </p>
          {paper.year && (
            <p className="text-xs text-muted-foreground">GATE CSE {paper.year}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={paper.storageUrl}
            download={paper.fileName}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-muted"
            title="Download PDF"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          <a
            href={paper.storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-muted"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            New Tab
          </a>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            title="Close viewer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── PDF iframe ── */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={`${paper.storageUrl}#toolbar=1&navpanes=1&view=FitH`}
          className="h-full w-full border-0"
          title={`${paper.displayTitle} — PDF Viewer`}
        />
      </div>
    </div>
  );
}

// ─── Paper Card ───────────────────────────────────────────────────────────────
function PaperCard({
  paper,
  onView,
}: {
  paper: Paper;
  onView: (p: Paper) => void;
}) {
  const title = paper.year
    ? `GATE CSE ${paper.year}`
    : paper.displayTitle;

  const subtitle = paper.year ? paper.displayTitle : paper.fileName;

  return (
    <div className="stat-card group flex flex-col gap-4 p-5 transition-all duration-200">
      {/* ── Icon + year badge ── */}
      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{
            background: "hsl(238 75% 96%)",
            color: "hsl(238 75% 58%)",
          }}
        >
          <FileText className="h-6 w-6" />
        </div>

        {paper.year && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold"
            style={{
              background: "hsl(238 75% 58% / 0.12)",
              color: "hsl(238 75% 45%)",
            }}
          >
            {paper.year}
          </span>
        )}
      </div>

      {/* ── Title ── */}
      <div className="flex-1">
        <h3 className="text-base font-bold text-foreground leading-snug">
          {title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={subtitle}>
          {subtitle}
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {paper.totalPages > 0 && (
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {paper.totalPages} {paper.totalPages === 1 ? "page" : "pages"}
          </span>
        )}
        {paper.questionCount > 0 && (
          <>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {paper.questionCount} questions
            </span>
          </>
        )}
        {paper.approvedCount > 0 && (
          <>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {paper.approvedCount} verified
            </span>
          </>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onView(paper)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:opacity-90 hover:-translate-y-0.5"
        >
          <Eye className="h-4 w-4" />
          View Paper
        </button>
        <a
          href={paper.storageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:-translate-y-0.5"
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="stat-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div className="skeleton h-12 w-12 rounded-xl" />
        <div className="skeleton h-6 w-12 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
      </div>
      <div className="skeleton h-3 w-1/2 rounded" />
      <div className="skeleton h-10 w-full rounded-xl" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-20 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
        style={{ background: "hsl(238 75% 96%)", color: "hsl(238 75% 58%)" }}
      >
        <FileText className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {hasFilter ? "No papers for this year" : "No question papers yet"}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
        {hasFilter
          ? "Try selecting a different year or view all papers."
          : "GATE question paper PDFs will appear here once uploaded by an admin."}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QuestionPapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [viewingPaper, setViewingPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPapers = useCallback(async (year: number | null) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      const res = await fetch(`/api/pyq/papers?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load question papers");
        return;
      }
      setPapers(data.papers);
      setYears(data.years);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPapers(null);
  }, [fetchPapers]);

  const handleYearFilter = (year: number | null) => {
    setSelectedYear(year);
    fetchPapers(year);
  };

  return (
    <>
      {/* PDF Viewer Modal */}
      {viewingPaper && (
        <PdfViewerModal
          paper={viewingPaper}
          onClose={() => setViewingPaper(null)}
        />
      )}

      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Question Papers</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Browse and view official GATE CSE question papers
            </p>
          </div>
          {papers.length > 0 && (
            <span className="text-xs text-muted-foreground self-start sm:self-center">
              {papers.length} paper{papers.length !== 1 ? "s" : ""} available
            </span>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Year filter bar ── */}
        {!loading && years.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5" />
              Year
            </span>
            <button
              onClick={() => handleYearFilter(null)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                selectedYear === null
                  ? "gradient-brand text-white shadow-brand"
                  : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              All Years
            </button>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => handleYearFilter(year)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  selectedYear === year
                    ? "gradient-brand text-white shadow-brand"
                    : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {/* ── Paper grid ── */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : papers.length === 0 ? (
            <EmptyState hasFilter={selectedYear !== null} />
          ) : (
            papers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onView={setViewingPaper}
              />
            ))
          )}
        </div>

        {/* ── Footer note ── */}
        {!loading && papers.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pb-2">
            <Calendar className="inline h-3 w-3 mr-1 align-middle" />
            Papers are uploaded by admins after processing. Question counts reflect extracted and verified questions.
          </p>
        )}
      </div>
    </>
  );
}
