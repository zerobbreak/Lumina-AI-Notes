import { getApiBaseUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";
import { ApiError, VersionConflictError } from "@/lib/api/errors";
import type { NoteDetailDto, NoteListItemDto, UpdateNoteBody } from "@/types/api/notes";

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const notesApi = {
  getRecent(token: string, limit = 5) {
    return apiFetch<NoteListItemDto[]>(`/notes/recent${qs({ limit })}`, { token });
  },

  getPinned(token: string, limit = 20) {
    return apiFetch<NoteListItemDto[]>(`/notes/pinned${qs({ limit })}`, { token });
  },

  getQuick(token: string, limit = 10) {
    return apiFetch<NoteListItemDto[]>(`/notes/quick${qs({ limit })}`, { token });
  },

  getArchived(token: string) {
    return apiFetch<NoteListItemDto[]>("/notes/archived", { token });
  },

  getByContext(
    token: string,
    params: { courseId?: string; moduleId?: string; tagId?: string },
  ) {
    return apiFetch<NoteListItemDto[]>(`/notes${qs(params)}`, { token });
  },

  getById(token: string, noteId: string) {
    return apiFetch<NoteDetailDto>(`/notes/${encodeURIComponent(noteId)}`, { token });
  },

  getChildNotes(token: string, parentNoteId: string) {
    return apiFetch<NoteListItemDto[]>(
      `/notes/${encodeURIComponent(parentNoteId)}/children`,
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
    return apiFetch<NoteDetailDto>("/notes", { method: "POST", token, body });
  },

  async update(token: string, noteId: string, body: UpdateNoteBody) {
    const res = await fetch(`${getApiBaseUrl()}/notes/${encodeURIComponent(noteId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      const payload = (await res.json()) as {
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
      let message = res.statusText;
      let code: string | undefined;
      try {
        const payload = (await res.json()) as {
          message?: string;
          error?: string | { message?: string; code?: string };
          code?: string;
        };
        if (payload.error && typeof payload.error === "object") {
          message = payload.error.message ?? message;
          code = payload.error.code;
        } else {
          message = payload.message ?? (typeof payload.error === "string" ? payload.error : message);
          code = payload.code;
        }
      } catch {
        // Non-JSON error body
      }
      throw new ApiError(message, res.status, code);
    }

    return (await res.json()) as NoteDetailDto;
  },

  touch(token: string, noteId: string) {
    return apiFetch<void>(`/notes/${encodeURIComponent(noteId)}/touch`, {
      method: "POST",
      token,
    });
  },

  delete(token: string, noteId: string) {
    return apiFetch<void>(`/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
      token,
    });
  },

  move(
    token: string,
    noteId: string,
    body: { courseId?: string; moduleId?: string },
  ) {
    return apiFetch<NoteDetailDto>(`/notes/${encodeURIComponent(noteId)}/move`, {
      method: "POST",
      token,
      body,
    });
  },
};
