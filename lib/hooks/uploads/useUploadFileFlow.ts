"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useCreateFile } from "@/lib/mutations/files/useCreateFile";
import { useUploadToStorage } from "@/lib/mutations/uploads/useUploadToStorage";

export function useUploadFileFlow() {
  const useRest = isRestApiEnabled();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadFileConvex = useMutation(api.files.uploadFile);
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
      if (useRest) {
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
        return;
      }

      let storageId: string | undefined;
      if (params.file) {
        const postUrl = await generateUploadUrl({});
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": params.file.type },
          body: params.file,
        });
        if (!result.ok) throw new Error("Upload failed");
        const json = (await result.json()) as { storageId: string };
        storageId = json.storageId;
      }

      await uploadFileConvex({
        name: params.name,
        type: params.type,
        url: params.url,
        storageId,
        courseId: params.courseId,
      });
    },
    [useRest, generateUploadUrl, uploadFileConvex, uploadToStorage, createFile],
  );
}
