"use client";

import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

/** User profile (REST). */
export function useUserData() {
  const userRest = useCurrentUser();

  if (userRest.isLoading) return undefined;
  return userRest.data ?? null;
}
