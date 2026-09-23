"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useUploadToStorage } from "@/lib/mutations/uploads/useUploadToStorage";

/** Upload bytes to storage and return the storage id/key for downstream file creation. */
export function useStorageUpload() {
  const useRest = isRestApiEnabled();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadToStorage = useUploadToStorage();

  return useCallback(
    async (file: File): Promise<string> => {
      if (useRest) {
        return uploadToStorage.mutateAsync(file);
      }

      const postUrl = await generateUploadUrl({});
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`);
      const { storageId } = (await result.json()) as { storageId: string };
      return storageId;
    },
    [useRest, generateUploadUrl, uploadToStorage],
  );
}
