"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useCreateNote } from "@/lib/mutations/notes/useCreateNote";
import { useDeleteNote } from "@/lib/mutations/notes/useDeleteNote";
import { useMoveNoteToFolder } from "@/lib/mutations/notes/useMoveNoteToFolder";
import { useRenameNote } from "@/lib/mutations/notes/useRenameNote";
import { useToggleArchiveNote } from "@/lib/mutations/notes/useToggleArchiveNote";
import { useTogglePinNote } from "@/lib/mutations/notes/useTogglePinNote";
import { useToggleShareNote } from "@/lib/mutations/notes/useToggleShareNote";
import { useTouchNote } from "@/lib/mutations/notes/useTouchNote";
import { useUpdateNote } from "@/lib/mutations/notes/useUpdateNote";
import type { UpdateNoteInput } from "@/lib/mutations/notes/useUpdateNote";

export function useNoteActions() {
  const useRest = isRestApiEnabled();

  const deleteNoteConvex = useMutation(api.notes.deleteNote);
  const renameNoteConvex = useMutation(api.notes.renameNote);
  const toggleArchiveConvex = useMutation(api.notes.toggleArchiveNote);
  const togglePinConvex = useMutation(api.notes.togglePinNote);
  const toggleShareConvex = useMutation(api.notes.toggleShareNote);
  const moveNoteConvex = useMutation(api.notes.moveNoteToFolder);
  const updateNoteConvex = useMutation(api.notes.updateNote);
  const touchNoteConvex = useMutation(api.notes.touchNote);

  const deleteNoteRest = useDeleteNote();
  const renameNoteRest = useRenameNote();
  const toggleArchiveRest = useToggleArchiveNote();
  const togglePinRest = useTogglePinNote();
  const toggleShareRest = useToggleShareNote();
  const moveNoteRest = useMoveNoteToFolder();
  const updateNoteRest = useUpdateNote();
  const touchNoteRest = useTouchNote();

  const deleteNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      if (useRest) {
        await deleteNoteRest.mutateAsync(args.noteId);
      } else {
        await deleteNoteConvex(args);
      }
    },
    [useRest, deleteNoteConvex, deleteNoteRest],
  );

  const renameNote = useCallback(
    async (args: { noteId: Id<"notes">; title: string }) => {
      if (useRest) {
        await renameNoteRest.mutateAsync(args);
      } else {
        await renameNoteConvex(args);
      }
    },
    [useRest, renameNoteConvex, renameNoteRest],
  );

  const toggleArchiveNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      if (useRest) {
        await toggleArchiveRest.mutateAsync(args.noteId);
      } else {
        await toggleArchiveConvex(args);
      }
    },
    [useRest, toggleArchiveConvex, toggleArchiveRest],
  );

  const togglePinNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      if (useRest) {
        await togglePinRest.mutateAsync(args.noteId);
      } else {
        await togglePinConvex(args);
      }
    },
    [useRest, togglePinConvex, togglePinRest],
  );

  const moveNoteToFolder = useCallback(
    async (args: {
      noteId: Id<"notes">;
      courseId?: string;
      moduleId?: string;
    }) => {
      if (useRest) {
        await moveNoteRest.mutateAsync(args);
      } else {
        await moveNoteConvex(args);
      }
    },
    [useRest, moveNoteConvex, moveNoteRest],
  );

  const updateNote = useCallback(
    async (args: UpdateNoteInput) => {
      if (useRest) {
        await updateNoteRest.mutateAsync(args);
      } else {
        await updateNoteConvex(args);
      }
    },
    [useRest, updateNoteConvex, updateNoteRest],
  );

  const touchNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      if (useRest) {
        await touchNoteRest.mutateAsync(args.noteId);
      } else {
        await touchNoteConvex(args);
      }
    },
    [useRest, touchNoteConvex, touchNoteRest],
  );

  const toggleShareNote = useCallback(
    async (args: { noteId: Id<"notes"> }): Promise<boolean> => {
      if (useRest) {
        const dto = await toggleShareRest.mutateAsync(args.noteId);
        return dto.isShared;
      }
      return toggleShareConvex(args);
    },
    [useRest, toggleShareConvex, toggleShareRest],
  );

  return {
    deleteNote,
    renameNote,
    toggleArchiveNote,
    togglePinNote,
    toggleShareNote,
    moveNoteToFolder,
    updateNote,
    touchNote,
  };
}

export function useCreateNoteAction() {
  const useRest = isRestApiEnabled();
  const createNoteConvex = useMutation(api.notes.createNote);
  const createNoteRest = useCreateNote();

  return useCallback(
    async (args: Parameters<typeof createNoteConvex>[0]) => {
      if (useRest) {
        return (await createNoteRest.mutateAsync(args)) as Id<"notes">;
      }
      return createNoteConvex(args);
    },
    [useRest, createNoteConvex, createNoteRest],
  );
}
