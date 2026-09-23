import { apiFetch, apiResponse, toApiError } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import { VersionConflictError } from "@/lib/api/errors";
import type { NoteDetailDto, NoteListItemDto, UpdateNoteBody } from "@/types/api/notes";


export const notesApi = {
  getRecent(token: string, limit = 5) {
    return apiFetch<NoteListItemDto[]>(apiPath`/notes/recent`, { query: { limit }, token });
  },

  getPinned(token: string, limit = 20) {
    return apiFetch<NoteListItemDto[]>(apiPath`/notes/pinned`, { query: { limit }, token });
  },

  getQuick(token: string, limit = 10) {
    return apiFetch<NoteListItemDto[]>(apiPath`/notes/quick`, { query: { limit }, token });
  },

  getArchived(token: string) {
    return apiFetch<NoteListItemDto[]>(apiPath`/notes/archived`, { token });
  },

  getResumeTarget(token: string) {
    return apiFetch<{ target: "home" } | { target: "note"; noteId: string }>(
      apiPath`/notes/resume-target`,
      { token },
    );
  },

  getByContext(
    token: string,
    params: { courseId?: string; moduleId?: string; tagId?: string },
  ) {
    return apiFetch<NoteListItemDto[]>(apiPath`/notes`, { query: params, token });
  },

  getById(token: string, noteId: string) {
    return apiFetch<NoteDetailDto>(apiPath`/notes/${noteId}`, { token });
  },

  getChildNotes(token: string, parentNoteId: string) {
    return apiFetch<NoteListItemDto[]>(
      apiPath`/notes/${parentNoteId}/children`,
      { token },
    );
  },

  create(
    token: string,
    body: {
      title: string;
      major?: string;
      courseId?: string;
      moduleId?: string;
      parentNoteId?: string;
      noteType?: string;
      style?: string;
      sourceRecordingId?: string;
    },
  ) {
    return apiFetch<NoteDetailDto>(apiPath`/notes`, { method: "POST", token, body });
  },

  async update(token: string, noteId: string, body: UpdateNoteBody) {
    // apiResponse rather than apiFetch: a 409 carries the current note to merge with.
    const res = await apiResponse(apiPath`/notes/${noteId}`, { method: "PATCH", token, body });

    if (res.status === 409) {
      const payload = (await res.clone().json().catch(() => ({}))) as {
        error?: { message?: string };
        note?: NoteDetailDto;
      };
      if (payload.note) {
        throw new VersionConflictError(
          payload.error?.message ?? "This note was changed by someone else",
          payload.note,
        );
      }
    }

    if (!res.ok) {
      throw await toApiError(res);
    }

    return (await res.json()) as NoteDetailDto;
  },

  touch(token: string, noteId: string) {
    return apiFetch<void>(apiPath`/notes/${noteId}/touch`, {
      method: "POST",
      token,
    });
  },

  delete(token: string, noteId: string) {
    return apiFetch<void>(apiPath`/notes/${noteId}`, {
      method: "DELETE",
      token,
    });
  },

  move(
    token: string,
    noteId: string,
    body: { courseId?: string; moduleId?: string },
  ) {
    return apiFetch<NoteDetailDto>(apiPath`/notes/${noteId}/move`, {
      method: "POST",
      token,
      body,
    });
  },
};
