"use client";

import type { NoteCardModel } from "@/lib/api/adapters/note";
import { useFiles } from "@/lib/queries/files/useFiles";
import { useNotesByContext } from "@/lib/queries/notes/useNotesByContext";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

export function useFolderViewData(contextId: string, contextType: string) {
  const restUser = useCurrentUser();
  const userData = restUser.data;

  // A module page shows every note filed under the module. Links to the old
  // sub-modules (contextType=module) open the module that holds them.
  const courseId =
    contextType === "course"
      ? contextId || undefined
      : contextType === "module"
        ? userData?.courses?.find((c) => c.modules?.some((m) => m.id === contextId))?.id
        : undefined;

  const contextNotesRest = useNotesByContext(courseId ? { courseId } : {}, {
    enabled: Boolean(courseId),
    format: "card",
  });
  const contextNotes = contextNotesRest.data as NoteCardModel[] | undefined;

  const contextFilesRest = useFiles(courseId ? { courseId } : undefined, Boolean(courseId));
  const contextFiles = contextFilesRest.data;

  return { userData, contextNotes, contextFiles, courseId };
}
