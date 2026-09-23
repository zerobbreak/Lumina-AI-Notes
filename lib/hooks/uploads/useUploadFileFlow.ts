"use client";

import { useCallback } from "react";
import { useCreateFile } from "@/lib/mutations/files/useCreateFile";
import { useUploadToStorage } from "@/lib/mutations/uploads/useUploadToStorage";

export function useUploadFileFlow() {
  const uploadToStorage = useUploadToStorage();
  const createFile = useCreateFile();

  return useCallback(
    async (params: {
      name: string;
      type: string;
      url?: string;
      file?: File;
      courseId?: string;
    }) => {
      let storageKey: string | undefined;
      if (params.file) {
        storageKey = await uploadToStorage.mutateAsync(params.file);
      }
      await createFile.mutateAsync({
        name: params.name,
        type: params.type,
        storageKey,
        url: params.url,
        courseId: params.courseId,
      });
    },
    [uploadToStorage, createFile],
  );
}
