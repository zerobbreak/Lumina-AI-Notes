"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode, useEffect } from "react";
import { QueryProvider } from "./QueryProvider";

export function AppProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const isElectron = typeof window !== "undefined" && "electronAPI" in window;

    if (isElectron) {
      // @ts-expect-error electron preload API
      window.electronAPI.onAuthToken(async (token: string) => {
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("Received auth token from Electron:", token);
          }
          window.location.reload();
        } catch (error) {
          console.error("Failed to handle auth token:", error);
        }
      });
    }
  }, []);

  return (
    <ClerkProvider>
      <QueryProvider>{children}</QueryProvider>
    </ClerkProvider>
  );
}
