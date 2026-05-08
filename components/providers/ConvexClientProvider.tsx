"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Check if we are in Electron
    const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

    if (isElectron) {
      // @ts-ignore
      window.electronAPI.onAuthToken(async (token: string) => {
        try {
          // In a real scenario, we might need more logic here 
          // to handle the session setting via Clerk
          if (process.env.NODE_ENV === "development") console.log("Received auth token from Electron:", token);
          // For now, we'll assume the app reloads or handles the token
          // If using Clerk's __clerk_db_jwt, we can potentially set it in cookies or storage
          window.location.reload();
        } catch (error) {
          console.error("Failed to handle auth token:", error);
        }
      });
    }
  }, []);

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
