"use client";

import { useAuth } from "@clerk/nextjs";

/** Auth state for layout guards — Clerk only. */
export function useAppAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn ?? false,
  };
}
