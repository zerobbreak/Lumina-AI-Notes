"use client";

import { useEffect, useState } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { Loader2, CheckCircle2 } from "lucide-react";
import { clerkAuthAppearance } from "@/lib/clerkAppearance";

/**
 * Desktop browser callback: show Clerk sign-in when signed out, then hand off a JWT
 * to the Electron app via custom protocol (lumina-notes://auth?token=...).
 */
export default function ElectronAuthPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");

  useEffect(() => {
    async function handleAuth() {
      if (isLoaded && isSignedIn) {
        setStatus("redirecting");
        try {
          const token = await getToken();
          if (token) {
            window.location.href = `lumina-notes://auth?token=${encodeURIComponent(token)}`;

            setTimeout(() => {
              setStatus("redirecting");
            }, 2000);
          } else {
            setStatus("error");
          }
        } catch (error) {
          console.error("Failed to get token:", error);
          setStatus("error");
        }
      }
    }

    handleAuth();
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-secondary/30 backdrop-blur-md border border-border p-8 rounded-2xl shadow-xl text-center space-y-6">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Loading…</h1>
          <p className="text-muted-foreground">Preparing secure sign-in for Lumina.</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <p className="text-center text-muted-foreground text-sm mb-6">
            Sign in to connect this session to the Lumina desktop app.
          </p>
          <SignIn
            appearance={clerkAuthAppearance}
            forceRedirectUrl="/electron-auth"
            fallbackRedirectUrl="/electron-auth"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-secondary/30 backdrop-blur-md border border-border p-8 rounded-2xl shadow-xl text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Authenticating...</h1>
            <p className="text-muted-foreground">Returning you to the desktop app.</p>
          </>
        )}

        {status === "redirecting" && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Success!</h1>
            <p className="text-muted-foreground">
              You can now close this window and return to the Lumina app.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-primary hover:underline text-sm"
              >
                Didn&apos;t redirect? Try again
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
            <p className="text-muted-foreground">
              Something went wrong. Please try logging in again from the app.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
