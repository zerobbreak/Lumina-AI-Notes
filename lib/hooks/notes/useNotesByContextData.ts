"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
import type { SidebarNoteModel } from "@/lib/api/adapters/note";
import { useNotesByContext } from "@/lib/queries/notes/useNotesByContext";

type ContextParams = { courseId?: string; moduleId?: string; tagId?: string };

export function useNotesByContextData(
  params: ContextParams,
  options?: { enabled?: boolean },
): SidebarNoteModel[] | undefined {
  const useRest = isRestApiEnabled();
  const enabled = options?.enabled ?? true;

  const convexNotes = useQuery(
    api.notes.getNotesByContext,
    !useRest && enabled && (params.courseId || params.moduleId)
      ? { courseId: params.courseId, moduleId: params.moduleId }
      : "skip",
  );

  const convexTagNotes = useQuery(
    api.notes.getNotesByTag,
    !useRest && enabled && params.tagId
      ? { tagId: params.tagId as Id<"tags"> }
      : "skip",
  );

  const restNotes = useNotesByContext(params, { enabled: useRest && enabled, format: "sidebar" });

  if (useRest) return restNotes.data;
  if (params.tagId) return convexTagNotes;
  return convexNotes;
}
