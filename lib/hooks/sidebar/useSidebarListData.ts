"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useUpcomingDeadlines } from "@/lib/queries/deadlines/useUpcomingDeadlines";
import { useFiles } from "@/lib/queries/files/useFiles";
import { useNote } from "@/lib/queries/notes/useNote";
import { usePinnedNotes } from "@/lib/queries/notes/usePinnedNotes";
import { useQuickNotes } from "@/lib/queries/notes/useQuickNotes";
import { useTagsWithCounts } from "@/lib/queries/tags/useTagsWithCounts";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { useTodayQueue } from "@/lib/queries/flashcards/useTodayQueue";

/** Read-only list data for the dashboard sidebar (REST when configured). */
export function useSidebarListData(currentNoteId: string | null) {
  const useRest = isRestApiEnabled();

  const convexUser = useQuery(api.users.getUser, useRest ? "skip" : {});
  const restUser = useCurrentUser();
  const userData = useRest ? restUser.data : convexUser;

  const quickNotesConvex = useQuery(api.notes.getQuickNotes, useRest ? "skip" : {});
  const quickNotesRest = useQuickNotes();
  const quickNotes = useRest ? quickNotesRest.data : quickNotesConvex;

  const recentFilesConvex = useQuery(api.files.getFiles, useRest ? "skip" : {});
  const recentFilesRest = useFiles({ limit: 10 });
  const recentFiles = useRest ? recentFilesRest.data : recentFilesConvex;

  const pinnedNotesConvex = useQuery(api.notes.getPinnedNotes, useRest ? "skip" : {});
  const pinnedNotesRest = usePinnedNotes(true);
  const pinnedNotes = useRest ? pinnedNotesRest.data : pinnedNotesConvex;

  const tagsConvex = useQuery(api.tags.getTagsWithCounts, useRest ? "skip" : {});
  const tagsRest = useTagsWithCounts();
  const tags = useRest ? tagsRest.data : tagsConvex;

  const todayQueueConvex = useQuery(api.flashcards.getTodayQueue, useRest ? "skip" : {});
  const todayQueueRest = useTodayQueue();
  const todayQueue = useRest ? todayQueueRest.data : todayQueueConvex;

  const upcomingConvex = useQuery(
    api.deadlines.getUpcoming,
    useRest ? "skip" : { limit: 1 },
  );
  const upcomingRest = useUpcomingDeadlines({ limit: 1 });
  const upcomingDeadlines = useRest ? upcomingRest.data : upcomingConvex;

  const openNoteConvex = useQuery(
    api.notes.getNote,
    !useRest && currentNoteId ? { noteId: currentNoteId as Id<"notes"> } : "skip",
  );
  const openNoteRest = useNote(currentNoteId);
  const openNote = useRest ? openNoteRest.data : openNoteConvex;
  const openNoteLoading = useRest
    ? openNoteRest.isLoading
    : Boolean(currentNoteId) && openNoteConvex === undefined;

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
