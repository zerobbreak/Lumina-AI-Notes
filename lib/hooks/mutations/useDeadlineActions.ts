"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useCreateDeadline } from "@/lib/mutations/deadlines/useCreateDeadline";

export function useDeadlineActions() {
  const useRest = isRestApiEnabled();

  const createDeadlineConvex = useMutation(api.deadlines.createDeadline);
  const createDeadlineRest = useCreateDeadline();

  const createDeadline = useCallback(
    async (args: {
      title: string;
      dueAt: number;
      kind: "assignment" | "exam" | "event" | "task";
      courseId?: string;
      moduleId?: string;
      notes?: string;
    }) => {
      if (useRest) {
        await createDeadlineRest.mutateAsync(args);
      } else {
        await createDeadlineConvex(args);
      }
    },
    [useRest, createDeadlineConvex, createDeadlineRest],
  );

  return { createDeadline };
}
