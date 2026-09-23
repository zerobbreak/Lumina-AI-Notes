import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { SearchNoteContentResponseDto, SearchResponseDto } from "@/types/api/search";


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
      apiPath`/search`,
      { query: { ...params, tagIds }, token },
    );
  },

  searchNoteContent(token: string, query: string, limit = 6) {
    return apiFetch<SearchNoteContentResponseDto>(
      apiPath`/search/note-content`,
      { query: { query, limit }, token },
    );
  },
};
