import { apiFetch } from "@/lib/api/client";
import type { UploadStatDto, UploadTargetDto } from "@/types/api/uploads";

export const uploadsApi = {
  createUpload(
    token: string,
    body: { filename: string; contentType: string; size: number },
  ) {
    return apiFetch<UploadTargetDto>("/uploads", { method: "POST", token, body });
  },

  stat(token: string, key: string) {
    return apiFetch<UploadStatDto>(`/uploads/stat?key=${encodeURIComponent(key)}`, { token });
  },
};
