"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfUploadZoneProps {
  onUploadSuccess: (importId: string) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function PdfUploadZone({ onUploadSuccess }: PdfUploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") return "Only PDF files are accepted";
    if (file.size > 50 * 1024 * 1024) return "File must be under 50MB";
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setErrorMessage(err);
      setState("error");
      return;
    }
    setSelectedFile(file);
    setErrorMessage("");
    setState("idle");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("dragging");
  }, []);

  const handleDragLeave = useCallback(() => {
    setState("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!selectedFile || state === "uploading") return;

    setState("uploading");
    setProgress(0);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/admin/pdf-imports", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      setProgress(100);
      setState("success");

      setTimeout(() => {
        onUploadSuccess(data.import.id);
      }, 800);
    } catch (err) {
      clearInterval(progressInterval);
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const reset = () => {
    setState("idle");
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage("");
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all duration-200",
          state === "dragging"
            ? "border-primary bg-primary/5 scale-[1.01]"
            : state === "error"
              ? "border-destructive bg-destructive/5"
              : state === "success"
                ? "border-success bg-success/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        {state === "uploading" ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Uploading {selectedFile?.name}…
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {progress < 90
                  ? "Uploading to Supabase Storage"
                  : "Counting pages…"}
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {progress}%
              </p>
            </div>
          </div>
        ) : state === "success" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-7 w-7 text-success" />
            </div>
            <p className="font-semibold text-foreground">Upload successful!</p>
            <p className="text-sm text-muted-foreground">Redirecting…</p>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <p className="font-semibold text-destructive">{errorMessage}</p>
            <button
              onClick={reset}
              className="mt-1 text-sm text-primary underline underline-offset-2 hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-90 transition-opacity"
              >
                <Upload className="h-4 w-4" />
                Upload & Process
              </button>
              <button
                onClick={reset}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">
                Drop your GATE PDF here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse — PDF only, max 50MB
              </p>
            </div>
            <label className="cursor-pointer rounded-lg border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Browse file
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleInputChange}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
