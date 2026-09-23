"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { useDeleteNote } from "@/lib/mutations/notes/useDeleteNote";
import { useMoveNoteToFolder } from "@/lib/mutations/notes/useMoveNoteToFolder";
import { useRenameNote } from "@/lib/mutations/notes/useRenameNote";
import { useToggleArchiveNote } from "@/lib/mutations/notes/useToggleArchiveNote";
import { useTogglePinNote } from "@/lib/mutations/notes/useTogglePinNote";
import { useToggleShareNote } from "@/lib/mutations/notes/useToggleShareNote";
import { useTouchNote } from "@/lib/mutations/notes/useTouchNote";
import { useUpdateNote } from "@/lib/mutations/notes/useUpdateNote";
import type { UpdateNoteInput } from "@/lib/mutations/notes/useUpdateNote";
import { useCreateNote } from "@/lib/mutations/notes/useCreateNote";
import type { CreateNoteInput } from "@/lib/mutations/notes/useCreateNote";

export function useNoteActions() {
  const { mutateAsync: deleteNoteAsync } = useDeleteNote();
  const { mutateAsync: renameNoteAsync } = useRenameNote();
  const { mutateAsync: toggleArchiveAsync } = useToggleArchiveNote();
  const { mutateAsync: togglePinAsync } = useTogglePinNote();
  const { mutateAsync: toggleShareAsync } = useToggleShareNote();
  const { mutateAsync: moveNoteAsync } = useMoveNoteToFolder();
  const { mutateAsync: updateNoteAsync } = useUpdateNote();
  const { mutateAsync: touchNoteAsync } = useTouchNote();

  const deleteNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await deleteNoteAsync(args.noteId);
    },
    [deleteNoteAsync],
  );

  const renameNote = useCallback(
    async (args: { noteId: Id<"notes">; title: string }) => {
      await renameNoteAsync(args);
    },
    [renameNoteAsync],
  );

  const toggleArchiveNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await toggleArchiveAsync(args.noteId);
    },
    [toggleArchiveAsync],
  );

  const togglePinNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await togglePinAsync(args.noteId);
    },
    [togglePinAsync],
  );

  const moveNoteToFolder = useCallback(
    async (args: {
      noteId: Id<"notes">;
      courseId?: string;
      moduleId?: string;
    }) => {
      await moveNoteAsync(args);
    },
    [moveNoteAsync],
  );

  const updateNote = useCallback(
    async (args: UpdateNoteInput) => {
      await updateNoteAsync(args);
    },
    [updateNoteAsync],
  );

  const touchNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await touchNoteAsync(args.noteId);
    },
    [touchNoteAsync],
  );

  const toggleShareNote = useCallback(
    async (args: { noteId: Id<"notes"> }): Promise<boolean> => {
      const dto = await toggleShareAsync(args.noteId);
      return dto.isShared;
    },
    [toggleShareAsync],
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
  const { mutateAsync: createNoteAsync } = useCreateNote();

  return useCallback(
    async (args: CreateNoteInput) => {
      return (await createNoteAsync(args)) as Id<"notes">;
    },
    [createNoteAsync],
  );
}
