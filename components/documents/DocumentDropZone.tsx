"use client";

import React, { useState, useCallback } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FileText, Loader2, X, Sparkles, Upload } from "lucide-react";
import { marked } from "marked";
import { toast } from "sonner";

interface DocumentDropZoneProps {
  onNotesGenerated?: (
    content: string,
    title: string,
    sourceDoc: { id: string; name: string }
  ) => void;
  onFileUploaded?: (file: File) => void;
  currentNoteContent?: string;
  className?: string;
  children?: React.ReactNode;
  acceptedFileTypes?: Record<string, string[]>;
}

/**
 * Document drop zone using react-dropzone
 * Handles both file uploads and existing document drops
 */
export function DocumentDropZone({
  onNotesGenerated,
  onFileUploaded,
  currentNoteContent,
  className = "",
  children,
  acceptedFileTypes = {
    "application/pdf": [".pdf"],
    "image/*": [".png", ".jpg", ".jpeg", ".gif"],
  },
}: DocumentDropZoneProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNotesFromDocument = useAction(api.ai.generateNotesFromDocument);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // For file uploads, call the upload callback
      // The actual note generation happens after processing
      acceptedFiles.forEach((file) => {
        onFileUploaded?.(file);
      });
    },
    [onFileUploaded]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    noClick: !!children, // Don't open file dialog on click if there are children
    noKeyboard: true,
  });

  // Handle drop of already-processed documents (from sidebar)
  const handleDocumentDrop = useCallback(
    async (e: React.DragEvent) => {
      const documentId = e.dataTransfer.getData(
        "application/lumina-resource-id"
      );
      const documentName = e.dataTransfer.getData(
        "application/lumina-resource-name"
      );

      if (!documentId) return; // Not a document drop, let react-dropzone handle it

      e.preventDefault();
      e.stopPropagation();
      setError(null);
      setIsGenerating(true);

      const toastId = toast.loading("Generating notes...", {
        description: "Extracting relevant information from your document",
      });

      try {
        const result = await generateNotesFromDocument({
          fileId: documentId as Id<"files">,
        });

        if (result.success && result.content && result.sourceDocument) {
          // Convert markdown to HTML for TipTap editor
          const htmlContent = await marked.parse(result.content);
          onNotesGenerated?.(
            htmlContent,
            result.title || `Notes from ${documentName}`,
            result.sourceDocument
          );
          toast.success("Notes generated successfully!", {
            id: toastId,
          });
        } else {
          const errorMessage = result.error || "Failed to generate notes";
          setError(errorMessage);
          toast.error(errorMessage, {
            id: toastId,
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate notes";
        setError(errorMessage);
        toast.error(errorMessage, {
          id: toastId,
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [generateNotesFromDocument, onNotesGenerated]
  );

  // Get root props but extract only the necessary handlers when children are present
  const rootProps = getRootProps();
  const dropZoneProps = children
    ? {
        // When children are present (editor), only handle actual file/document drops
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
          // Check if it's a document drop first
          if (e.dataTransfer.getData("application/lumina-resource-id")) {
            handleDocumentDrop(e);
          } else if (e.dataTransfer.files.length > 0) {
            // Only handle if there are actual files being dropped
            rootProps.onDrop?.(e as React.DragEvent<HTMLElement>);
          }
          // Otherwise, ignore - it's just text selection
        },
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
          // Only prevent default if there are actual files being dragged
          // Check dataTransfer.types to see if this is a file drag or just text selection
          if (
            e.dataTransfer.types.includes("Files") ||
            e.dataTransfer.types.includes("application/lumina-resource-id")
          ) {
            rootProps.onDragOver?.(e as React.DragEvent<HTMLElement>);
          }
          // Otherwise, don't call preventDefault - allow text selection
        },
        onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
          // Only handle if there are files
          if (e.dataTransfer.types.includes("Files")) {
            rootProps.onDragEnter?.(e as React.DragEvent<HTMLElement>);
          }
        },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
          // Only handle if there are files
          if (e.dataTransfer.types.includes("Files")) {
            rootProps.onDragLeave?.(e as React.DragEvent<HTMLElement>);
          }
        },
      }
    : {
        // When no children (upload area), use all dropzone props
        ...rootProps,
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
          if (e.dataTransfer.getData("application/lumina-resource-id")) {
            handleDocumentDrop(e);
          } else {
            rootProps.onDrop?.(e as React.DragEvent<HTMLElement>);
          }
        },
      };

  return (
    <div
      {...dropZoneProps}
      className={`relative ${className} ${
        isDragActive ? "ring-2 ring-indigo-500 bg-indigo-500/10" : ""
      } transition-all duration-200`}
    >
      <input {...getInputProps()} />

      {children || (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-lg hover:border-indigo-500/50 transition-colors cursor-pointer">
          <Upload className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-gray-300 text-center">
            Drop files here or click to upload
          </p>
          <p className="text-gray-500 text-sm mt-1">PDF, images supported</p>
        </div>
      )}

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/80 backdrop-blur-sm rounded-lg z-50 pointer-events-none">
          <div className="text-center">
            <FileText className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
            <p className="text-white font-medium">Drop to upload</p>
            <p className="text-indigo-300 text-sm">
              AI will process and generate notes
            </p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-white px-4 py-3 rounded-lg flex items-center justify-between z-50">
          <span className="text-sm">{error}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
            }}
            className="text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface DraggableDocumentProps {
  documentId: string;
  documentName: string;
  processingStatus?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper to make a document item draggable
 */
export function DraggableDocument({
  documentId,
  documentName,
  processingStatus,
  children,
  className = "",
  showDragIndicator = true,
}: DraggableDocumentProps & { showDragIndicator?: boolean }) {
  const [isDragging, setIsDragging] = useState(false);
  const isReady = processingStatus === "done";

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!isReady) {
        e.preventDefault();
        return;
      }

      e.dataTransfer.setData("application/lumina-resource-id", documentId);
      e.dataTransfer.setData("application/lumina-resource-name", documentName);
      e.dataTransfer.effectAllowed = "copy";
      setIsDragging(true);
    },
    [documentId, documentName, isReady]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      draggable={isReady}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${className} ${
        isReady
          ? "cursor-grab active:cursor-grabbing"
          : "cursor-not-allowed opacity-60"
      } ${isDragging ? "opacity-50" : ""} group relative`}
      title={
        isReady ? "Drag to generate notes" : "Document still processing..."
      }
    >
      {children}
      {isReady && showDragIndicator && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Sparkles className="w-3 h-3 text-indigo-400" />
        </div>
      )}
    </div>
  );
}

interface QuickReferenceInsertProps {
  fileId: string;
  currentNoteContent?: string;
  onInsert?: (content: string) => void;
}

/**
 * Quick insert document reference button
 */
export function QuickReferenceInsert({
  fileId,
  currentNoteContent,
  onInsert,
}: QuickReferenceInsertProps) {
  const [isLoading, setIsLoading] = useState(false);
  const getDocumentReference = useAction(api.ai.getDocumentReference);

  const handleInsertReference = async () => {
    setIsLoading(true);
    try {
      const result = await getDocumentReference({
        fileId: fileId as Id<"files">,
        currentNoteContent,
      });

      if (result.success && result.reference) {
        const { summary, relevantExcerpts, citation } = result.reference;

        const content = `
> **From ${citation}:**
> ${summary}
${relevantExcerpts.length > 0 ? `\n**Key Points:**\n${relevantExcerpts.map((e) => `- ${e}`).join("\n")}` : ""}
`;
        // Convert markdown to HTML for TipTap editor
        const htmlContent = await marked.parse(content.trim());
        onInsert?.(htmlContent);
      }
    } catch (err) {
      console.error("Failed to get reference:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleInsertReference}
      disabled={isLoading}
      className="flex items-center gap-1.5 px-2 py-1 text-xs bg-indigo-500/20 text-indigo-300 rounded hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <FileText className="w-3 h-3" />
      )}
      Insert Reference
    </button>
  );
}
