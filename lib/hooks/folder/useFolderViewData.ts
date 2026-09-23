"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { NoteCardModel } from "@/lib/api/adapters/note";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useFiles } from "@/lib/queries/files/useFiles";
import { useNotesByContext } from "@/lib/queries/notes/useNotesByContext";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

export function useFolderViewData(contextId: string, contextType: string) {
  const useRest = isRestApiEnabled();

  const convexUser = useQuery(api.users.getUser, useRest ? "skip" : {});
  const restUser = useCurrentUser();
  const userData = useRest ? restUser.data : convexUser;

  const contextParams =
    contextId && contextType === "course"
      ? { courseId: contextId }
      : contextId && contextType === "module"
        ? { moduleId: contextId }
        : {};

  const hasContext = Boolean(contextId && (contextType === "course" || contextType === "module"));

  const contextNotesConvex = useQuery(
    api.notes.getNotesByContext,
    !useRest && hasContext ? contextParams : "skip",
  );
  const contextNotesRest = useNotesByContext(contextParams, {
    enabled: useRest && hasContext,
    format: "card",
  });
  const contextNotes = (useRest ? contextNotesRest.data : contextNotesConvex) as
    | NoteCardModel[]
    | undefined;

  const contextFilesConvex = useQuery(
    api.files.getFilesByContext,
    !useRest && contextId && contextType === "course" ? { courseId: contextId } : "skip",
  );
  const contextFilesRest = useFiles(
    contextType === "course" && contextId ? { courseId: contextId } : undefined,
    useRest && contextType === "course" && Boolean(contextId),
  );
  const contextFiles = useRest ? contextFilesRest.data : contextFilesConvex;

  return { userData, contextNotes, contextFiles };
}
