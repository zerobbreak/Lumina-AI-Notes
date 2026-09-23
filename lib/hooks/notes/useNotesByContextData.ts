"use client";

import type { SidebarNoteModel } from "@/lib/api/adapters/note";
import { useNotesByContext } from "@/lib/queries/notes/useNotesByContext";

type ContextParams = { courseId?: string; moduleId?: string; tagId?: string };

export function useNotesByContextData(
  params: ContextParams,
  options?: { enabled?: boolean },
): SidebarNoteModel[] | undefined {
  const enabled = options?.enabled ?? true;

  const restNotes = useNotesByContext(params, { enabled, format: "sidebar" });
  return restNotes.data;
}
