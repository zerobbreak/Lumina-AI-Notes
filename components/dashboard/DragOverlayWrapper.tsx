"use client";

import { useState, useCallback } from "react";
import { useDropzone, FileRejection, DropEvent } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { GenerateFromFileDialog } from "./dialogs/GenerateFromFileDialog";
import { useSearchParams } from "next/navigation";

interface DragOverlayWrapperProps {
  children: React.ReactNode;
}

export const DragOverlayWrapper = ({ children }: DragOverlayWrapperProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    fileName: string;
    storageId: string;
  } | null>(null);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const searchParams = useSearchParams();

  // Helper to upload file to Convex storage
  const uploadFileToStorage = async (file: File): Promise<string> => {
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!result.ok) {
      throw new Error(`Upload failed: ${result.statusText}`);
    }

    const { storageId } = await result.json();
    return storageId;
  };

  const onDrop = useCallback(
    async (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: DropEvent
    ) => {
      // Check if this is an internal resource drag (from sidebar)
      const dropEvent = event as DragEvent;
      if (dropEvent.dataTransfer) {
        const resourceId = dropEvent.dataTransfer.getData(
          "application/lumina-resource-id"
        );
        if (resourceId) {
          return;
        }
      }

      // Handle rejected files
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const isFolder =
          rejection.file.type === "" && rejection.file.size === 0;
        if (isFolder) {
          toast.error(
            "Folders cannot be uploaded. Please drop a PDF or audio file."
          );
        } else {
          toast.error(
            `"${rejection.file.name}" is not supported. Please drop a PDF or audio file.`
          );
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file
      if (file.size === 0 || (!file.type && file.size === 0)) {
        toast.error(
          "Folders cannot be uploaded. Please drop a PDF or audio file."
        );
        return;
      }

      if (file.type !== "application/pdf") {
        toast.error(
          "Only PDF files are supported for note and flashcard generation."
        );
        return;
      }

      // Upload and show dialog
      setIsUploading(true);

      try {
        const storageId = await uploadFileToStorage(file);
        setPendingFile({ fileName: file.name, storageId });
        setShowDialog(true);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to upload file"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl]
  );

  const handleDialogClose = () => {
    setShowDialog(false);
    setPendingFile(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "audio/*": [".mp3", ".wav", ".m4a"],
    },
  });

  return (
    <div {...getRootProps()} className="h-full w-full relative group">
      <input {...getInputProps()} />

      {/* Uploading overlay */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              <p className="text-white/70 mt-6 text-lg">Uploading file...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 border-dashed border-indigo-500/50">
                <svg
                  className="w-12 h-12 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">
                Drop PDF Here
              </h3>
              <p className="text-white/60 text-lg">
                Generate study notes or flashcards from your document
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Destination selection dialog */}
      {pendingFile && (
        <GenerateFromFileDialog
          open={showDialog}
          onOpenChange={handleDialogClose}
          fileName={pendingFile.fileName}
          storageId={pendingFile.storageId}
          defaultCourseId={searchParams.get("courseId") || undefined}
          onComplete={handleDialogClose}
        />
      )}

      {children}
    </div>
  );
};
