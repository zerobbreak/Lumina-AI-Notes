"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { useDeleteFile } from "@/lib/mutations/files/useDeleteFile";
import { useRenameFile } from "@/lib/mutations/files/useRenameFile";
import { useRetryFileProcessing } from "@/lib/mutations/files/useRetryFileProcessing";

export function useFileActions() {
  const deleteFileMutation = useDeleteFile();
  const renameFileMutation = useRenameFile();
  const retryProcessingMutation = useRetryFileProcessing();

  const deleteFile = useCallback(
    async (args: { fileId: Id<"files"> }) => {
      await deleteFileMutation.mutateAsync(args.fileId);
    },
    [deleteFileMutation],
  );

  const renameFile = useCallback(
    async (args: { fileId: Id<"files">; name: string }) => {
      await renameFileMutation.mutateAsync(args);
    },
    [renameFileMutation],
  );

  const retryProcessing = useCallback(
    async (args: { fileId: Id<"files"> }) => {
      await retryProcessingMutation.mutateAsync(args.fileId);
    },
    [retryProcessingMutation],
  );

  return { deleteFile, renameFile, retryProcessing };
}
