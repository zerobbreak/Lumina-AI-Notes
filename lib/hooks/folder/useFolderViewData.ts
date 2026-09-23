"use client";

import type { NoteCardModel } from "@/lib/api/adapters/note";
import { useFiles } from "@/lib/queries/files/useFiles";
import { useNotesByContext } from "@/lib/queries/notes/useNotesByContext";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

export function useFolderViewData(contextId: string, contextType: string) {
  const restUser = useCurrentUser();
  const userData = restUser.data;

  const contextParams =
    contextId && contextType === "course"
      ? { courseId: contextId }
      : contextId && contextType === "module"
        ? { moduleId: contextId }
        : {};

  const hasContext = Boolean(contextId && (contextType === "course" || contextType === "module"));

  const contextNotesRest = useNotesByContext(contextParams, {
    enabled: hasContext,
    format: "card",
  });
  const contextNotes = contextNotesRest.data as NoteCardModel[] | undefined;

  const contextFilesRest = useFiles(
    contextType === "course" && contextId ? { courseId: contextId } : undefined,
    contextType === "course" && Boolean(contextId),
  );
  const contextFiles = contextFilesRest.data;

  return { userData, contextNotes, contextFiles };
}
