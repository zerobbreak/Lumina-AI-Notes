import { apiFetch } from "@/lib/api/client";
import type { TagWithCountDto } from "@/types/api/tags";

export type TagDto = {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: number;
};

export const tagsApi = {
  listWithCounts(token: string) {
    return apiFetch<TagWithCountDto[]>("/tags", { token });
  },

  create(token: string, body: { name: string; color: string }) {
    return apiFetch<TagDto>("/tags", { method: "POST", token, body });
  },

  update(token: string, tagId: string, body: { name?: string; color?: string }) {
    return apiFetch<TagDto>(`/tags/${encodeURIComponent(tagId)}`, {
      method: "PATCH",
      token,
      body,
    });
  },

  delete(token: string, tagId: string) {
    return apiFetch<void>(`/tags/${encodeURIComponent(tagId)}`, {
      method: "DELETE",
      token,
    });
  },
};
