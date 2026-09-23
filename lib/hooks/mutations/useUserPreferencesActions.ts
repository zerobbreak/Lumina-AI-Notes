"use client";

import { useCallback } from "react";
import { useUpdatePreferences } from "@/lib/mutations/users/useUpdatePreferences";
import type { UpdatePreferencesInput } from "@/types/api/user";

export function useUserPreferencesActions() {
  const { mutateAsync: updatePreferencesAsync } = useUpdatePreferences();

  const updatePreferences = useCallback(
    async (args: UpdatePreferencesInput) => {
      await updatePreferencesAsync(args);
    },
    [updatePreferencesAsync],
  );

  return { updatePreferences };
}
