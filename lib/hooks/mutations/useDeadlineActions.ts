"use client";

import { useCallback } from "react";
import { useCreateDeadline } from "@/lib/mutations/deadlines/useCreateDeadline";

export function useDeadlineActions() {
  const { mutateAsync: createDeadlineAsync } = useCreateDeadline();

  const createDeadline = useCallback(
    async (args: {
      title: string;
      dueAt: number;
      kind: "assignment" | "exam" | "event" | "task";
      courseId?: string;
      moduleId?: string;
      notes?: string;
    }) => {
      await createDeadlineAsync(args);
    },
    [createDeadlineAsync],
  );

  return { createDeadline };
}
