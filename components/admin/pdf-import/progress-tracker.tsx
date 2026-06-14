"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  importId: string;
  initialStatus: string;
  initialProgress: number;
  onComplete?: () => void;
}

export function ProgressTracker({
  importId,
  initialStatus,
  initialProgress,
  onComplete,
}: ProgressTrackerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [processedPages, setProcessedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/pdf-imports/${importId}`);
        if (!res.ok) return;
        const data = await res.json();
        const imp = data.import;

        setStatus(imp.status);
        setProgress(imp.progressPercent ?? 0);
        setProcessedPages(imp.processedPages ?? 0);
        setTotalPages(imp.totalPages ?? 0);

        if (imp.status === "COMPLETED" || imp.status === "FAILED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (imp.status === "COMPLETED") onComplete?.();
        }
      } catch {
        // silent
      }
    };

    pollingRef.current = setInterval(poll, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [importId, status, onComplete]);

  if (status === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Processing complete — {totalPages} pages processed
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Processing failed. Check error details and retry.
      </div>
    );
  }

  if (status !== "PROCESSING") return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Processing PDF — page {processedPages} of {totalPages}
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-all duration-700",
              progress === 0 && "animate-pulse"
            )}
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {progress}%
        </p>
      </div>
    </div>
  );
}
