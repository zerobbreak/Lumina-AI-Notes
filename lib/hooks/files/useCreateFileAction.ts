"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useCreateFile } from "@/lib/mutations/files/useCreateFile";
export function useCreateFileAction() {
  const useRest = isRestApiEnabled();
  const uploadFileConvex = useMutation(api.files.uploadFile);
  const createFileRest = useCreateFile();

  return useCallback(
    async (params: {
      name: string;
      type: string;
      courseId?: string;
      url?: string;
      storageId?: string;
    }) => {
      if (useRest) {
        await createFileRest.mutateAsync({
          name: params.name,
          type: params.type,
          courseId: params.courseId,
          url: params.url,
          storageKey: params.storageId,
        });
        return;
      }

      await uploadFileConvex({
        name: params.name,
        type: params.type,
        courseId: params.courseId,
        url: params.url,
        storageId: params.storageId,
      });
    },
    [useRest, uploadFileConvex, createFileRest],
  );
}
