"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { collaborationApi } from "@/lib/api/domains/collaboration.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { invalidateCollaboration } from "@/lib/invalidation";

export function useCollaborationActions(noteId: Id<"notes">) {
  const { getApiToken } = useApiToken();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    invalidateCollaboration(queryClient, noteId);
  }, [queryClient, noteId]);

  const inviteToNote = useCallback(
    async (args: { noteId: Id<"notes">; email: string; role: "viewer" | "editor" }) => {
      const token = await getApiToken();
      const res = await collaborationApi.inviteToNote(token, args.noteId, {
        email: args.email,
        role: args.role,
      });
      invalidate();
      return res;
    },
    [getApiToken, invalidate],
  );

  const removeCollaborator = useCallback(
    async (args: { noteId: Id<"notes">; collaboratorUserId: string }) => {
      const token = await getApiToken();
      await collaborationApi.removeCollaborator(
        token,
        args.noteId,
        args.collaboratorUserId,
      );
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const updateCollaboratorRole = useCallback(
    async (args: {
      noteId: Id<"notes">;
      collaboratorUserId: string;
      role: "viewer" | "editor";
    }) => {
      const token = await getApiToken();
      await collaborationApi.updateCollaboratorRole(
        token,
        args.noteId,
        args.collaboratorUserId,
        { role: args.role },
      );
      invalidate();
    },
    [getApiToken, invalidate],
  );

  const revokeInvite = useCallback(
    async (args: { noteId: Id<"notes">; email: string }) => {
      const token = await getApiToken();
      await collaborationApi.revokeInvite(token, args.noteId, { email: args.email });
      invalidate();
    },
    [getApiToken, invalidate],
  );

  return { inviteToNote, removeCollaborator, updateCollaboratorRole, revokeInvite };
}
