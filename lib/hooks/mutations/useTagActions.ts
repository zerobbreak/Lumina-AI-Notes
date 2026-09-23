"use client";

import { useCallback } from "react";
import type { Id } from "@/types/data-model";
import { useCreateTag } from "@/lib/mutations/tags/useCreateTag";
import { useDeleteTag } from "@/lib/mutations/tags/useDeleteTag";
import { useUpdateTag } from "@/lib/mutations/tags/useUpdateTag";

export function useTagActions() {
  const { mutateAsync: createTagAsync } = useCreateTag();
  const { mutateAsync: updateTagAsync } = useUpdateTag();
  const { mutateAsync: deleteTagAsync } = useDeleteTag();

  const createTag = useCallback(
    async (args: { name: string; color: string }) => {
      await createTagAsync(args);
    },
    [createTagAsync],
  );

  const updateTag = useCallback(
    async (args: { tagId: Id<"tags">; name?: string; color?: string }) => {
      await updateTagAsync(args);
    },
    [updateTagAsync],
  );

  const deleteTag = useCallback(
    async (args: { tagId: Id<"tags"> }) => {
      await deleteTagAsync(args.tagId);
    },
    [deleteTagAsync],
  );

  return { createTag, updateTag, deleteTag };
}
