"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useDeleteFile } from "@/lib/mutations/files/useDeleteFile";
import { useRenameFile } from "@/lib/mutations/files/useRenameFile";
import { useRetryFileProcessing } from "@/lib/mutations/files/useRetryFileProcessing";

export function useFileActions() {
  const useRest = isRestApiEnabled();

  const deleteFileConvex = useMutation(api.files.deleteFile);
  const renameFileConvex = useMutation(api.files.renameFile);
  const retryProcessingConvex = useMutation(api.files.retryProcessing);

  const deleteFileRest = useDeleteFile();
  const renameFileRest = useRenameFile();
  const retryProcessingRest = useRetryFileProcessing();

  const deleteFile = useCallback(
    async (args: { fileId: Id<"files"> }) => {
      if (useRest) {
        await deleteFileRest.mutateAsync(args.fileId);
      } else {
        await deleteFileConvex(args);
      }
    },
    [useRest, deleteFileConvex, deleteFileRest],
  );

  const renameFile = useCallback(
    async (args: { fileId: Id<"files">; name: string }) => {
      if (useRest) {
        await renameFileRest.mutateAsync(args);
      } else {
        await renameFileConvex(args);
      }
    },
    [useRest, renameFileConvex, renameFileRest],
  );

  const retryProcessing = useCallback(
    async (args: { fileId: Id<"files"> }) => {
      if (useRest) {
        await retryProcessingRest.mutateAsync(args.fileId);
      } else {
        await retryProcessingConvex(args);
      }
    },
    [useRest, retryProcessingConvex, retryProcessingRest],
  );

  return { deleteFile, renameFile, retryProcessing };
}
