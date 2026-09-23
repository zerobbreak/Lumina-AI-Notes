"use client";

import { useCallback } from "react";
import { useUpdatePreferences } from "@/lib/mutations/users/useUpdatePreferences";
import type { UpdatePreferencesInput } from "@/types/api/user";

export function useUserPreferencesActions() {
  const updatePreferencesMutation = useUpdatePreferences();

  const updatePreferences = useCallback(
    async (args: UpdatePreferencesInput) => {
      await updatePreferencesMutation.mutateAsync(args);
    },
    [updatePreferencesMutation],
  );

  return { updatePreferences };
}
