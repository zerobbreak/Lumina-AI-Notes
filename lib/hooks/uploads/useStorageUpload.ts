"use client";

import { useCallback } from "react";
import { useUploadToStorage } from "@/lib/mutations/uploads/useUploadToStorage";

/** Upload bytes to storage and return the storage id/key for downstream file creation. */
export function useStorageUpload() {
  const uploadToStorage = useUploadToStorage();

  return useCallback(
    async (file: File): Promise<string> => {
      return uploadToStorage.mutateAsync(file);
    },
    [uploadToStorage],
  );
}
