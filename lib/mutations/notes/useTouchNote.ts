"use client";

import { useMutation } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/domains/notes.api";
import { useApiToken } from "@/lib/api/use-api-token";

export function useTouchNote() {
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (noteId: string) => {
const token = await getApiToken();
      await notesApi.touch(token, noteId);
    },
  });
}
