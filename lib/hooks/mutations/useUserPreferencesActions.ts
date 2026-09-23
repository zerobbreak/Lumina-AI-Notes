"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { isRestApiEnabled } from "@/lib/api/enabled";
import { useUpdatePreferences } from "@/lib/mutations/users/useUpdatePreferences";
import type { UpdatePreferencesInput } from "@/types/api/user";

export function useUserPreferencesActions() {
  const useRest = isRestApiEnabled();

  const updatePreferencesConvex = useMutation(api.users.updatePreferences);
  const updatePreferencesRest = useUpdatePreferences();

  const updatePreferences = useCallback(
    async (args: UpdatePreferencesInput) => {
      if (useRest) {
        await updatePreferencesRest.mutateAsync(args);
      } else {
        await updatePreferencesConvex(args);
      }
    },
    [useRest, updatePreferencesConvex, updatePreferencesRest],
  );

  return { updatePreferences };
}
