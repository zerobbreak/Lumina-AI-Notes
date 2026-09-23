"use client";

import { useQuery } from "@tanstack/react-query";
import { toPublicNote } from "@/lib/api/adapters/public";
import { getPublicNote } from "@/lib/api/domains/public.api";
import { publicKeys } from "@/lib/query-keys/public";

export function usePublicNote(noteId: string | undefined) {
  return useQuery({
    queryKey: publicKeys.note(noteId ?? ""),
    queryFn: async () => {
      const dto = await getPublicNote(noteId!);
      return dto ? toPublicNote(dto) : null;
    },
    enabled: !!noteId,
    retry: false,
  });
}
