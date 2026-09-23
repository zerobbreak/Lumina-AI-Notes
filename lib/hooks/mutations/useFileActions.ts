"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { useDeleteFile } from "@/lib/mutations/files/useDeleteFile";
import { useRenameFile } from "@/lib/mutations/files/useRenameFile";
import { useRetryFileProcessing } from "@/lib/mutations/files/useRetryFileProcessing";

export function useFileActions() {
  const { mutateAsync: deleteFileAsync } = useDeleteFile();
  const { mutateAsync: renameFileAsync } = useRenameFile();
  const { mutateAsync: retryProcessingAsync } = useRetryFileProcessing();

  const deleteFile = useCallback(
    async (args: { fileId: Id<"files"> }) => {
      await deleteFileAsync(args.fileId);
    },
    [deleteFileAsync],
  );

  const renameFile = useCallback(
    async (args: { fileId: Id<"files">; name: string }) => {
      await renameFileAsync(args);
    },
    [renameFileAsync],
  );

  const retryProcessing = useCallback(
    async (args: { fileId: Id<"files"> }) => {
      await retryProcessingAsync(args.fileId);
    },
    [retryProcessingAsync],
  );

  return { deleteFile, renameFile, retryProcessing };
}
