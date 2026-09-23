"use client";

import { useUpcomingDeadlines } from "@/lib/queries/deadlines/useUpcomingDeadlines";
import { useFiles } from "@/lib/queries/files/useFiles";
import { useNote } from "@/lib/queries/notes/useNote";
import { usePinnedNotes } from "@/lib/queries/notes/usePinnedNotes";
import { useQuickNotes } from "@/lib/queries/notes/useQuickNotes";
import { useTagsWithCounts } from "@/lib/queries/tags/useTagsWithCounts";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { useTodayQueue } from "@/lib/queries/flashcards/useTodayQueue";

/** Read-only list data for the dashboard sidebar (REST). */
export function useSidebarListData(currentNoteId: string | null) {
  const restUser = useCurrentUser();
  const userData = restUser.data;

  const quickNotesRest = useQuickNotes();
  const quickNotes = quickNotesRest.data;

  const recentFilesRest = useFiles({ limit: 10 });
  const recentFiles = recentFilesRest.data;

  const pinnedNotesRest = usePinnedNotes(true);
  const pinnedNotes = pinnedNotesRest.data;

  const tagsRest = useTagsWithCounts();
  const tags = tagsRest.data;

  const todayQueueRest = useTodayQueue();
  const todayQueue = todayQueueRest.data;

  const upcomingRest = useUpcomingDeadlines({ limit: 1 });
  const upcomingDeadlines = upcomingRest.data;

  const openNoteRest = useNote(currentNoteId);
  const openNote = openNoteRest.data;
  const openNoteLoading = openNoteRest.isLoading;

  return {
    userData,
    quickNotes,
    recentFiles,
    pinnedNotes,
    tags,
    todayQueue,
    upcomingDeadlines,
    openNote,
    openNoteLoading,
  };
}
