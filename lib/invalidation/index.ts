import type { QueryClient } from "@tanstack/react-query";
import type { BrightspaceStatusDto } from "@/types/api/integrations";
import { calendarKeys } from "@/lib/query-keys/calendar";
import { chatKeys } from "@/lib/query-keys/chats";
import { collaborationKeys } from "@/lib/query-keys/collaboration";
import { deadlineKeys } from "@/lib/query-keys/deadlines";
import { fileKeys } from "@/lib/query-keys/files";
import { homeKeys } from "@/lib/query-keys/home";
import { integrationKeys } from "@/lib/query-keys/integrations";
import { flashcardKeys } from "@/lib/query-keys/flashcards";
import { noteKeys } from "@/lib/query-keys/notes";
import { quizKeys } from "@/lib/query-keys/quizzes";
import { recordingKeys } from "@/lib/query-keys/recordings";
import { tagKeys } from "@/lib/query-keys/tags";
import { userKeys } from "@/lib/query-keys/users";

/** The home summary is built from notes, cards, quizzes, deadlines and courses. */
function invalidateHome(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: homeKeys.all });
}

/** The calendar's activity: notes and recordings made, cards reviewed, quizzes taken. */
function invalidateCalendar(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
}

export function invalidateNotes(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: noteKeys.all });
  invalidateHome(queryClient);
  invalidateCalendar(queryClient);
}

export function invalidateUser(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: userKeys.me() });
  invalidateHome(queryClient);
}

export function invalidateTags(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: tagKeys.all });
}

export function invalidateFiles(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: fileKeys.all });
}

export function invalidateDeadlines(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
  invalidateHome(queryClient);
}

export function invalidateRecordings(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: recordingKeys.all });
  invalidateCalendar(queryClient);
}

export function invalidateChats(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: chatKeys.all });
}

/** Like invalidateChats, but resolves once the active chat queries have refetched. */
export function refreshChats(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: chatKeys.all });
}

export function invalidateFlashcards(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
  invalidateHome(queryClient);
  invalidateCalendar(queryClient);
}

export function invalidateQuizzes(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: quizKeys.all });
  invalidateHome(queryClient);
  invalidateCalendar(queryClient);
}

export function invalidateCollaboration(queryClient: QueryClient, noteId?: string) {
  if (noteId) {
    void queryClient.invalidateQueries({ queryKey: collaborationKeys.people(noteId) });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
}

/**
 * Brightspace mutations answer with the new connection status, so it goes
 * straight into the cache. A sync can add, move or remove deadlines anywhere,
 * and create courses for new Brightspace courses.
 */
export function applyBrightspaceStatus(
  queryClient: QueryClient,
  response: BrightspaceStatusDto & { sync?: unknown },
) {
  // The sync summary is a one-off report, not part of the cached status.
  const status = { ...response };
  delete status.sync;
  queryClient.setQueryData<BrightspaceStatusDto>(integrationKeys.brightspace(), status);
  invalidateDeadlines(queryClient);
  invalidateUser(queryClient);
}
