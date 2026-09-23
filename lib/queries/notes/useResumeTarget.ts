"use client";

import { useQuery } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { noteKeys } from "@/lib/query-keys/notes";

export type ResumeTarget =
  | { target: "home" }
  | { target: "note"; noteId: string };

export function useResumeTarget() {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: noteKeys.resumeTarget(),
    queryFn: async (): Promise<ResumeTarget> => {
      const token = await getApiToken();
      return notesApi.getResumeTarget(token);
    },
    enabled: isReady,
  });
}
