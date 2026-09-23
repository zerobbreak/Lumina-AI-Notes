"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useCreateTag } from "@/lib/mutations/tags/useCreateTag";
import { useDeleteTag } from "@/lib/mutations/tags/useDeleteTag";
import { useUpdateTag } from "@/lib/mutations/tags/useUpdateTag";

export function useTagActions() {
  const useRest = isRestApiEnabled();

  const createTagConvex = useMutation(api.tags.createTag);
  const updateTagConvex = useMutation(api.tags.updateTag);
  const deleteTagConvex = useMutation(api.tags.deleteTag);

  const createTagRest = useCreateTag();
  const updateTagRest = useUpdateTag();
  const deleteTagRest = useDeleteTag();

  const createTag = useCallback(
    async (args: { name: string; color: string }) => {
      if (useRest) {
        await createTagRest.mutateAsync(args);
      } else {
        await createTagConvex(args);
      }
    },
    [useRest, createTagConvex, createTagRest],
  );

  const updateTag = useCallback(
    async (args: { tagId: Id<"tags">; name?: string; color?: string }) => {
      if (useRest) {
        await updateTagRest.mutateAsync(args);
      } else {
        await updateTagConvex(args);
      }
    },
    [useRest, updateTagConvex, updateTagRest],
  );

  const deleteTag = useCallback(
    async (args: { tagId: Id<"tags"> }) => {
      if (useRest) {
        await deleteTagRest.mutateAsync(args.tagId);
      } else {
        await deleteTagConvex(args);
      }
    },
    [useRest, deleteTagConvex, deleteTagRest],
  );

  return { createTag, updateTag, deleteTag };
}
