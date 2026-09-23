"use client";

import type { Id } from "@/types/data-model";
import { usePresenceCount } from "@/lib/queries/presence/usePresenceCount";
import { usePresenceViewers } from "@/lib/queries/presence/usePresenceViewers";

export function usePresenceViewersData(noteId: Id<"notes">) {
  const viewersRest = usePresenceViewers(noteId);
  return viewersRest.isLoading ? undefined : viewersRest.data;
}

export function usePresenceCountData(noteId: Id<"notes">) {
  const countRest = usePresenceCount(noteId);
  return countRest.data;
}
