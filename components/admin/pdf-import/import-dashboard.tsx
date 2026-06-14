"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Play,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  FileUp,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PdfUploadZone } from "./pdf-upload-zone";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PdfImportRecord {
  id: string;
  fileName: string;
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalPages: number;
  questionCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  errorMsg: string | null;
  createdAt: string;
}

interface DashboardStats {
  totalImports: number;
  totalQuestionsExtracted: number;
  pendingReviews: number;
  approvedQuestions: number;
  failedPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  UPLOADED: {
    label: "Uploaded",
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  PROCESSING: {
    label: "Processing",
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
};

function StatusBadge({ status }: { status: PdfImportRecord["status"] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        config.bg,
        config.color
      )}
    >
      <Icon
        className={cn("h-3 w-3", status === "PROCESSING" && "animate-spin")}
      />
      {config.label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="stat-card p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImportDashboard() {
  const router = useRouter();
  const [imports, setImports] = useState<PdfImportRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pdf-imports");
      if (!res.ok) return;
      const data = await res.json();
      setImports(data.imports ?? []);
      setStats(data.stats ?? null);
    } catch {
      // Silent fail on poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 4 seconds to update processing status
    pollingRef.current = setInterval(fetchData, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData]);

  const handleProcess = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/admin/pdf-imports/${id}/process`, { method: "POST" });
      await fetchData();
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleUploadSuccess = async (importId: string) => {
    await fetchData();
    // Auto-start processing
    await handleProcess(importId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            PDF Import System
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload GATE question papers and extract questions automatically using
            Gemini Vision.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={FileUp}
            label="Total PDFs"
            value={stats.totalImports}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={BarChart3}
            label="Questions Extracted"
            value={stats.totalQuestionsExtracted}
            color="bg-accent/10 text-accent"
          />
          <StatCard
            icon={Clock}
            label="Pending Review"
            value={stats.pendingReviews}
            color="bg-warning/10 text-warning"
          />
          <StatCard
            icon={TrendingUp}
            label="Approved"
            value={stats.approvedQuestions}
            color="bg-success/10 text-success"
          />
          <StatCard
            icon={AlertTriangle}
            label="Failed Pages"
            value={stats.failedPages}
            color="bg-destructive/10 text-destructive"
          />
        </div>
      )}

      {/* Upload Zone */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Upload New PDF
        </h2>
        <PdfUploadZone onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Imports Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Import History
          </h2>
        </div>

        {imports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No imports yet</p>
            <p className="text-sm text-muted-foreground">
              Upload your first GATE PDF above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    File
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Questions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Review Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Uploaded
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {imports.map((imp) => (
                  <tr
                    key={imp.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-foreground max-w-[220px] truncate">
                          {imp.fileName}
                        </span>
                      </div>
                      {imp.errorMsg && (
                        <p className="mt-1 text-xs text-destructive truncate max-w-[240px]">
                          {imp.errorMsg}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={imp.status} />
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {imp.totalPages}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-foreground">
                        {imp.questionCount}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {imp.questionCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-success transition-all"
                              style={{
                                width: `${Math.round((imp.approvedCount / imp.questionCount) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {imp.approvedCount}/{imp.questionCount}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {new Date(imp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {(imp.status === "UPLOADED" ||
                          imp.status === "FAILED") && (
                          <button
                            onClick={() => handleProcess(imp.id)}
                            disabled={processingIds.has(imp.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            {processingIds.has(imp.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Process
                          </button>
                        )}
                        {imp.questionCount > 0 && (
                          <button
                            onClick={() =>
                              router.push(`/admin/review-import/${imp.id}`)
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-3 w-3" />
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
