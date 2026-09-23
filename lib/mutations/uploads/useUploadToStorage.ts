"use client";

import { useMutation } from "@tanstack/react-query";
import { uploadsApi } from "@/lib/api/domains/uploads.api";
import { useApiToken } from "@/lib/api/use-api-token";

export function useUploadToStorage() {
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
const token = await getApiToken();
      const contentType = file.type || "application/octet-stream";
      const target = await uploadsApi.createUpload(token, {
        filename: file.name,
        contentType,
        size: file.size,
      });

      const uploadRes = await fetch(target.url, {
        method: target.method,
        headers: target.headers,
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      return target.key;
    },
  });
}
