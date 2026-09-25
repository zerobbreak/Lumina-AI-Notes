"use client";

import { ClerkProvider, useSignIn } from "@clerk/nextjs";
import { ReactNode, useEffect } from "react";
import { QueryProvider } from "./QueryProvider";

/**
 * Redeems the sign-in ticket relayed from the electron-auth browser tab
 * (see electron/main.js `handleAuthUrl`) to establish a Clerk session
 * inside the Electron window itself. Must render under <ClerkProvider>.
 */
function ElectronAuthBridge() {
  const { isLoaded, signIn, setActive } = useSignIn();

  useEffect(() => {
    if (!isLoaded || !window.electronAPI) return;

    return window.electronAPI.onAuthTicket(async (ticket) => {
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
  }, [isLoaded, signIn, setActive]);

  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ElectronAuthBridge />
      <QueryProvider>{children}</QueryProvider>
    </ClerkProvider>
  );
}
