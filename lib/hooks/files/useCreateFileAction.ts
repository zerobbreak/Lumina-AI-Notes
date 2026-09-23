"use client";

import { useCallback } from "react";
import { useCreateFile } from "@/lib/mutations/files/useCreateFile";

export function useCreateFileAction() {
  const createFile = useCreateFile();

  return useCallback(
    async (params: {
      name: string;
      type: string;
      courseId?: string;
      url?: string;
      storageId?: string;
    }) => {
      await createFile.mutateAsync({
        name: params.name,
        type: params.type,
        courseId: params.courseId,
        url: params.url,
        storageKey: params.storageId,
      });
    },
    [createFile],
  );
}
