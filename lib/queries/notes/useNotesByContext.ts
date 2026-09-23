"use client";

import { useQuery } from "@tanstack/react-query";
import { noteListItemToCard, noteListItemsToSidebar } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

type ContextParams = { courseId?: string; moduleId?: string; tagId?: string };

export function useNotesByContext(
  params: ContextParams,
  options?: { enabled?: boolean; format?: "sidebar" | "card" },
) {
  const { getApiToken, isReady } = useApiToken();
  const enabled = options?.enabled ?? true;
  const format = options?.format ?? "sidebar";

  return useQuery({
    queryKey: noteKeys.byContext(params),
    queryFn: async () => {
      const token = await getApiToken();
      const items = await notesApi.getByContext(token, params);
      return format === "card" ? items.map(noteListItemToCard) : noteListItemsToSidebar(items);
    },
    enabled: isRestApiEnabled() && isReady && enabled,
  });
}
