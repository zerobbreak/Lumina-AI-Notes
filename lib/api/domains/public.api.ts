import { apiUrl } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import { ApiError } from "@/lib/api/errors";
import type { PublicNoteDto } from "@/types/api/public";

/** Public routes live under `/api/v1/public` and do not require auth. */
export async function getPublicNote(noteId: string): Promise<PublicNoteDto | null> {
  const res = await fetch(apiUrl(apiPath`/public/notes/${noteId}`), {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const payload = (await res.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(message, res.status);
  }

  return (await res.json()) as PublicNoteDto;
}
