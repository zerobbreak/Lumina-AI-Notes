"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { useCreateTag } from "@/lib/mutations/tags/useCreateTag";
import { useDeleteTag } from "@/lib/mutations/tags/useDeleteTag";
import { useUpdateTag } from "@/lib/mutations/tags/useUpdateTag";

export function useTagActions() {
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const createTag = useCallback(
    async (args: { name: string; color: string }) => {
      await createTagMutation.mutateAsync(args);
    },
    [createTagMutation],
  );

  const updateTag = useCallback(
    async (args: { tagId: Id<"tags">; name?: string; color?: string }) => {
      await updateTagMutation.mutateAsync(args);
    },
    [updateTagMutation],
  );

  const deleteTag = useCallback(
    async (args: { tagId: Id<"tags"> }) => {
      await deleteTagMutation.mutateAsync(args.tagId);
    },
    [deleteTagMutation],
  );

  return { createTag, updateTag, deleteTag };
}
