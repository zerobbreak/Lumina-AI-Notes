"use client";

import type { Id } from "@/types/data-model";
import { useCollaborators } from "@/lib/queries/collaboration/useCollaborators";

export function useCollaborationData(noteId: Id<"notes">, enabled = true) {
  const accessRest = useCollaborators(noteId, enabled);

  return accessRest.isLoading ? undefined : accessRest.data;
}
