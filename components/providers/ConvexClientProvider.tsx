"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useEffect } from "react";

/**
 * Build the Convex client, tolerating a missing URL at module-evaluation time.
 *
 * `next build` prerenders pages that never touch Convex (`/_not-found`,
 * `/sign-up`), and module scope is evaluated for all of them. Constructing the
 * client eagerly therefore aborted the entire build whenever
 * NEXT_PUBLIC_CONVEX_URL was absent ("No address provided") or empty
 * ("Provided address was not an absolute URL") — which is exactly the case in
 * CI, where the secret is unset and expands to "".
 *
 * Returning null instead defers the failure to the browser, where a missing URL
 * is a genuine misconfiguration and is reported loudly (see below).
 */
function createConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  try {
    return new ConvexReactClient(url);
  } catch (error) {
    console.error("[Convex] Invalid NEXT_PUBLIC_CONVEX_URL:", error);
    return null;
  }
}

const convex = createConvexClient();

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

  if (!convex) {
    // In a browser this is a real misconfiguration, so fail as loudly as the
    // old module-scope constructor did. During prerender there is no window,
    // so Convex-free pages still build.
    if (typeof window !== "undefined") {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL is missing or invalid. Set it to your Convex deployment URL (e.g. https://your-app.convex.cloud).",
      );
    }
    return <ClerkProvider>{children}</ClerkProvider>;
  }

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
