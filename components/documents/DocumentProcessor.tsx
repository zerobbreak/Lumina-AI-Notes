"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Document Processor Hook
 * Automatically processes pending PDF documents after upload
 * Displays processing status for files
 */
export function useDocumentProcessor() {
  const pendingFiles = useQuery(api.files.getPendingFiles);
  const processDocument = useAction(api.ai.processDocument);

  // Auto-process pending files
  useEffect(() => {
    if (!pendingFiles || pendingFiles.length === 0) return;

    const processNextFile = async () => {
      const file = pendingFiles[0];
      if (file) {
        try {
          await processDocument({ fileId: file._id as Id<"files"> });
        } catch (error) {
          console.error("Failed to process document:", error);
        }
      }
    };

    processNextFile();
  }, [pendingFiles, processDocument]);

  return {
    pendingCount: pendingFiles?.length || 0,
    isProcessing: (pendingFiles?.length || 0) > 0,
  };
}

interface DocumentStatusBadgeProps {
  status: string | undefined;
  progressPercent?: number;
  queuePosition?: number;
}

/**
 * Badge component showing document processing status
 */
export function DocumentStatusBadge({
  status,
  progressPercent,
  queuePosition,
}: DocumentStatusBadgeProps) {
  if (!status || status === "done") return null;

  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pending: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      label: "Pending",
    },
    processing: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      label: "Processing...",
    },
    error: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      label: "Error",
    },
  };

  const style = styles[status] || styles.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {status === "processing" && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      )}
      {style.label}
      {typeof progressPercent === "number" && status !== "error" && (
        <span className="opacity-70">{Math.round(progressPercent)}%</span>
      )}
      {typeof queuePosition === "number" && status === "pending" && (
        <span className="opacity-70">#{queuePosition}</span>
      )}
    </span>
  );
}

interface ProcessedDocumentInfoProps {
  summary?: string;
  keyTopics?: string[];
}

/**
 * Component to display processed document info (summary & topics)
 */
export function ProcessedDocumentInfo({
  summary,
  keyTopics,
}: ProcessedDocumentInfoProps) {
  if (!summary && (!keyTopics || keyTopics.length === 0)) return null;

  return (
    <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
      {summary && (
        <p className="text-xs text-gray-400 line-clamp-2">{summary}</p>
      )}
      {keyTopics && keyTopics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keyTopics.slice(0, 5).map((topic, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface DocumentCitationProps {
  citations: Array<{
    marker: string;
    documentId: string;
    documentName: string;
  }>;
  onClickDocument?: (documentId: string) => void;
}

/**
 * Component to display document citations with clickable links
 */
export function DocumentCitations({
  citations,
  onClickDocument,
}: DocumentCitationProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
      <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
        Sources
      </h4>
      <div className="space-y-1">
        {citations.map((citation) => (
          <button
            key={citation.marker}
            onClick={() => onClickDocument?.(citation.documentId)}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span className="text-gray-500 font-mono">{citation.marker}</span>
            <span className="truncate">{citation.documentName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
