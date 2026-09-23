import { apiFetch } from "@/lib/api/client";
import type { SearchResponseDto } from "@/types/api/search";

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const searchApi = {
  search(
    token: string,
    params: {
      query: string;
      type?: "note" | "file" | "deck" | "all";
      courseId?: string;
      tagIds?: string[];
    },
  ) {
    const tagIds = params.tagIds?.length ? params.tagIds.join(",") : undefined;
    return apiFetch<SearchResponseDto>(
      `/search${qs({ ...params, tagIds })}`,
      { token },
    );
  },
};
