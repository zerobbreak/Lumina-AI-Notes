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
  const deleteNoteMutation = useDeleteNote();
  const renameNoteMutation = useRenameNote();
  const toggleArchiveMutation = useToggleArchiveNote();
  const togglePinMutation = useTogglePinNote();
  const toggleShareMutation = useToggleShareNote();
  const moveNoteMutation = useMoveNoteToFolder();
  const updateNoteMutation = useUpdateNote();
  const touchNoteMutation = useTouchNote();

  const deleteNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await deleteNoteMutation.mutateAsync(args.noteId);
    },
    [deleteNoteMutation],
  );

  const renameNote = useCallback(
    async (args: { noteId: Id<"notes">; title: string }) => {
      await renameNoteMutation.mutateAsync(args);
    },
    [renameNoteMutation],
  );

  const toggleArchiveNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await toggleArchiveMutation.mutateAsync(args.noteId);
    },
    [toggleArchiveMutation],
  );

  const togglePinNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await togglePinMutation.mutateAsync(args.noteId);
    },
    [togglePinMutation],
  );

  const moveNoteToFolder = useCallback(
    async (args: {
      noteId: Id<"notes">;
      courseId?: string;
      moduleId?: string;
    }) => {
      await moveNoteMutation.mutateAsync(args);
    },
    [moveNoteMutation],
  );

  const updateNote = useCallback(
    async (args: UpdateNoteInput) => {
      await updateNoteMutation.mutateAsync(args);
    },
    [updateNoteMutation],
  );

  const touchNote = useCallback(
    async (args: { noteId: Id<"notes"> }) => {
      await touchNoteMutation.mutateAsync(args.noteId);
    },
    [touchNoteMutation],
  );

  const toggleShareNote = useCallback(
    async (args: { noteId: Id<"notes"> }): Promise<boolean> => {
      const dto = await toggleShareMutation.mutateAsync(args.noteId);
      return dto.isShared;
    },
    [toggleShareMutation],
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
  const createNoteMutation = useCreateNote();

  return useCallback(
    async (args: CreateNoteInput) => {
      return (await createNoteMutation.mutateAsync(args)) as Id<"notes">;
    },
    [createNoteMutation],
  );
}
