"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboard } from "@/hooks/useDashboard";

interface CreateNoteInput {
  title: string;
  major?: string;
  courseId?: string;
  moduleId?: string;
  parentNoteId?: Id<"notes">;
  noteType?: string;
  sourceRecordingId?: Id<"recordings">;
}

export function useCreateNoteFlow(): {
  createNoteFlow: (
    input: CreateNoteInput,
  ) => Promise<{ noteId: Id<"notes">; style: string }>;
} {
  const userData = useQuery(api.users.getUser);
  const createNote = useMutation(api.notes.createNote);
  const { setNoteBootstrap } = useDashboard();

  const createNoteFlow = useCallback(
    async (input: CreateNoteInput) => {
      const noteId = await createNote({
        title: input.title,
        major: input.major || userData?.major || "general",
        courseId: input.courseId,
        moduleId: input.moduleId,
        parentNoteId: input.parentNoteId,
        noteType: input.noteType,
        style: "standard",
        sourceRecordingId: input.sourceRecordingId,
      });
      setNoteBootstrap({
        noteId,
        title: input.title,
        courseId: input.courseId,
        moduleId: input.moduleId,
        parentNoteId: input.parentNoteId,
        style: "standard",
      });
      return { noteId, style: "standard" as const };
    },
    [createNote, userData?.major, setNoteBootstrap],
  );

  return { createNoteFlow };
}
