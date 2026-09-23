import type { QueryClient } from "@tanstack/react-query";
import { deadlineKeys } from "@/lib/query-keys/deadlines";
import { fileKeys } from "@/lib/query-keys/files";
import { noteKeys } from "@/lib/query-keys/notes";
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
