"use client";

import { ClerkProvider, useAuth, useSignIn } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ReactNode, useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

declare global {
  interface Window {
    electronAPI?: {
      loginInBrowser: () => void;
      onAuthTicket: (callback: (ticket: string) => void) => () => void;
    };
  }
}

/**
 * Redeems the sign-in ticket relayed from the electron-auth browser tab
 * (see electron/main.js `handleAuthUrl`) to establish a Clerk session
 * inside the Electron window itself. Must render under <ClerkProvider>.
 */
function ElectronAuthBridge() {
  const { isLoaded, signIn, setActive } = useSignIn();

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !window.electronAPI) return;

    const unsubscribe = window.electronAPI.onAuthTicket(async (ticket) => {
      try {
        const result = await signIn.create({ strategy: "ticket", ticket });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
        } else {
          console.error("Electron sign-in did not complete:", result.status);
        }
      } catch (error) {
        console.error("Failed to redeem electron auth ticket:", error);
      }
    });

    return unsubscribe;
  }, [isLoaded, signIn, setActive]);

  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ElectronAuthBridge />
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
