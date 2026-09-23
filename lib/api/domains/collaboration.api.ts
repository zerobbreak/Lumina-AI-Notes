import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type {
  CollaboratorsListDto,
  InviteToNoteResultDto,
  NoteAccessDto,
} from "@/types/api/collaboration";

export const collaborationApi = {
  getNoteAccess(token: string, noteId: string) {
    return apiFetch<NoteAccessDto>(apiPath`/notes/${noteId}/access`, { token });
  },

  listPeopleWithAccess(token: string, noteId: string) {
    return apiFetch<CollaboratorsListDto>(apiPath`/notes/${noteId}/collaborators`, { token });
  },

  inviteToNote(
    token: string,
    noteId: string,
    body: { email: string; role: "viewer" | "editor" },
  ) {
    return apiFetch<InviteToNoteResultDto>(apiPath`/notes/${noteId}/collaborators/invite`, {
      method: "POST",
      token,
      body,
    });
  },

  removeCollaborator(token: string, noteId: string, userId: string) {
    return apiFetch<{ removed: boolean }>(apiPath`/notes/${noteId}/collaborators/${userId}`, {
      method: "DELETE",
      token,
    });
  },

  updateCollaboratorRole(
    token: string,
    noteId: string,
    userId: string,
    body: { role: "viewer" | "editor" },
  ) {
    return apiFetch<{ updated: boolean }>(apiPath`/notes/${noteId}/collaborators/${userId}`, {
      method: "PATCH",
      token,
      body,
    });
  },

  revokeInvite(token: string, noteId: string, body: { email: string }) {
    return apiFetch<{ revoked: boolean }>(apiPath`/notes/${noteId}/invites`, {
      method: "DELETE",
      token,
      body,
    });
  },
};
