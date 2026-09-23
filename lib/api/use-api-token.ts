"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export function useApiToken() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const getApiToken = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      throw new Error("Not signed in");
    }
    return token;
  }, [getToken]);

  return {
    getApiToken,
    isReady: isLoaded && isSignedIn,
  };
}
