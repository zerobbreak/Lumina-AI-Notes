import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { CreateFileBody, FileListItemDto } from "@/types/api/files";


export const filesApi = {
  list(token: string, params?: { courseId?: string; limit?: number }) {
    return apiFetch<FileListItemDto[]>(apiPath`/files`, { query: params ?? {}, token });
  },

  create(token: string, body: CreateFileBody) {
    return apiFetch<FileListItemDto>(apiPath`/files`, { method: "POST", token, body });
  },

  rename(token: string, fileId: string, name: string) {
    return apiFetch<FileListItemDto>(apiPath`/files/${fileId}`, {
      method: "PATCH",
      token,
      body: { name },
    });
  },

  delete(token: string, fileId: string) {
    return apiFetch<void>(apiPath`/files/${fileId}`, {
      method: "DELETE",
      token,
    });
  },

  retryProcessing(token: string, fileId: string) {
    return apiFetch<void>(apiPath`/files/${fileId}/retry`, {
      method: "POST",
      token,
    });
  },

  listPending(token: string) {
    return apiFetch<FileListItemDto[]>(apiPath`/files/pending`, { token });
  },
};
