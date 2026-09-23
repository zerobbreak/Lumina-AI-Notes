import type { QueryClient } from "@tanstack/react-query";
import { chatKeys } from "@/lib/query-keys/chats";
import { collaborationKeys } from "@/lib/query-keys/collaboration";
import { deadlineKeys } from "@/lib/query-keys/deadlines";
import { fileKeys } from "@/lib/query-keys/files";
import { flashcardKeys } from "@/lib/query-keys/flashcards";
import { noteKeys } from "@/lib/query-keys/notes";
import { quizKeys } from "@/lib/query-keys/quizzes";
import { recordingKeys } from "@/lib/query-keys/recordings";
import { tagKeys } from "@/lib/query-keys/tags";
import { userKeys } from "@/lib/query-keys/users";

export function invalidateNotes(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: noteKeys.all });
}

export function invalidateUser(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: userKeys.me() });
}

export function invalidateTags(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: tagKeys.all });
}

export function invalidateFiles(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: fileKeys.all });
}

export function invalidateDeadlines(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
}

export function invalidateRecordings(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: recordingKeys.all });
}

export function invalidateChats(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: chatKeys.all });
}

export function invalidateFlashcards(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
}

export function invalidateQuizzes(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: quizKeys.all });
}

export function invalidateCollaboration(queryClient: QueryClient, noteId?: string) {
  if (noteId) {
    void queryClient.invalidateQueries({ queryKey: collaborationKeys.people(noteId) });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
}
