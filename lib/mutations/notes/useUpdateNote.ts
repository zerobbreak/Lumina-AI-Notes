"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { noteDetailToEditor } from "@/lib/api/adapters/note";
import { notesApi } from "@/lib/api/domains/notes.api";
import { VersionConflictError } from "@/lib/api/errors";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateNotes } from "@/lib/invalidation";
import { noteKeys } from "@/lib/query-keys/notes";
import type { UpdateNoteBody } from "@/types/api/notes";
import type { Id } from "@/types/data-model";

const CONTENT_FIELDS = ["content", "outlineData", "outlineMetadata", "wordCount"] as const;

export type UpdateNoteInput = {
  noteId: Id<"notes">;
  title?: string;
  content?: string;
  style?: string;
  outlineData?: string;
  outlineMetadata?: UpdateNoteBody["outlineMetadata"];
  tagIds?: Id<"tags">[];
  wordCount?: number;
  quickCaptureType?: string;
  quickCaptureAudioUrl?: string;
  quickCaptureStatus?: string;
  quickCaptureExpandedNoteId?: Id<"notes">;
  sourceRecordingId?: Id<"recordings">;
};

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { getApiToken } = useApiToken();

  return useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
const { noteId, ...patch } = input;
      const token = await getApiToken();
      const isContentSave = CONTENT_FIELDS.some(
        (field) => patch[field as keyof typeof patch] !== undefined,
      );

      const body: UpdateNoteBody = { ...patch };
      if (isContentSave) {
        const cached = queryClient.getQueryData(
          noteKeys.detail(noteId),
        ) as ReturnType<typeof noteDetailToEditor> | undefined;
        body.version = cached?.version ?? 0;
      }

      try {
        return await notesApi.update(token, noteId, body);
      } catch (error) {
        if (error instanceof VersionConflictError) {
          queryClient.setQueryData(
            noteKeys.detail(noteId),
            noteDetailToEditor(error.note),
          );
        }
        throw error;
      }
    },
    onSuccess: (dto, input) => {
      queryClient.setQueryData(
        noteKeys.detail(input.noteId),
        noteDetailToEditor(dto),
      );
      invalidateNotes(queryClient);
    },
  });
}
