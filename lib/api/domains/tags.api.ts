import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
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
    return apiFetch<TagWithCountDto[]>(apiPath`/tags`, { token });
  },

  create(token: string, body: { name: string; color: string }) {
    return apiFetch<TagDto>(apiPath`/tags`, { method: "POST", token, body });
  },

  update(token: string, tagId: string, body: { name?: string; color?: string }) {
    return apiFetch<TagDto>(apiPath`/tags/${tagId}`, {
      method: "PATCH",
      token,
      body,
    });
  },

  delete(token: string, tagId: string) {
    return apiFetch<void>(apiPath`/tags/${tagId}`, {
      method: "DELETE",
      token,
    });
  },
};
