import { apiFetch } from "@/lib/api/client";
import type { CreateFileBody, FileListItemDto } from "@/types/api/files";

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const filesApi = {
  list(token: string, params?: { courseId?: string; limit?: number }) {
    return apiFetch<FileListItemDto[]>(`/files${qs(params ?? {})}`, { token });
  },

  create(token: string, body: CreateFileBody) {
    return apiFetch<FileListItemDto>("/files", { method: "POST", token, body });
  },

  rename(token: string, fileId: string, name: string) {
    return apiFetch<FileListItemDto>(`/files/${encodeURIComponent(fileId)}`, {
      method: "PATCH",
      token,
      body: { name },
    });
  },

  delete(token: string, fileId: string) {
    return apiFetch<void>(`/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      token,
    });
  },

  retryProcessing(token: string, fileId: string) {
    return apiFetch<void>(`/files/${encodeURIComponent(fileId)}/retry`, {
      method: "POST",
      token,
    });
  },
};
