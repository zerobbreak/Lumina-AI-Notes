import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { UploadStatDto, UploadTargetDto } from "@/types/api/uploads";

export const uploadsApi = {
  createUpload(
    token: string,
    body: { filename: string; contentType: string; size: number },
  ) {
    return apiFetch<UploadTargetDto>(apiPath`/uploads`, { method: "POST", token, body });
  },

  stat(token: string, key: string) {
    return apiFetch<UploadStatDto>(apiPath`/uploads/stat`, { token, query: { key } });
  },
};
