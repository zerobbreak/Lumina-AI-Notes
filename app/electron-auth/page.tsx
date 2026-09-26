"use client";

import { useEffect, useState } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { Loader2, CheckCircle2 } from "lucide-react";
import { clerkAuthAppearance } from "@/lib/clerkAppearance";
import { PaperSurface } from "@/components/paper/PaperSurface";

/**
 * Desktop browser callback: show Clerk sign-in when signed out, then hand off a
 * short-lived sign-in ticket to the Electron app via custom protocol
 * (lumina-notes://auth?ticket=...). A ticket (not a raw JWT) is required because
 * this browser tab's Clerk session/cookies aren't visible to the Electron window.
 */
export default function ElectronAuthPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [authState, setAuthState] = useState<string | null>();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");

  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get("state");
    setAuthState(state);
    if (!state) setStatus("error");
  }, []);

  useEffect(() => {
    async function handleAuth() {
      if (isLoaded && isSignedIn && authState) {
        setStatus("redirecting");
        try {
          const res = await fetch("/api/electron/ticket", { method: "POST" });
          if (!res.ok) throw new Error("Failed to mint sign-in ticket");
          const { ticket } = await res.json();
          window.location.href =
            `lumina-notes://auth?ticket=${encodeURIComponent(ticket)}` +
            `&state=${encodeURIComponent(authState)}`;

          setTimeout(() => {
            setStatus("redirecting");
          }, 2000);
        } catch (error) {
          console.error("Failed to get auth ticket:", error);
          setStatus("error");
        }
      }
    }

    handleAuth();
  }, [authState, isLoaded, isSignedIn]);

  if (!isLoaded || authState === undefined) {
    return (
      <PaperSurface className="grain flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-md space-y-5 p-8 text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin" style={{ color: "var(--vermilion)" }} />
          <h1 className="display text-[1.6rem]">Loading…</h1>
          <p className="text-[0.93rem]" style={{ color: "var(--ink-soft)" }}>
            Preparing secure sign-in for Lumina.
          </p>
        </div>
      </PaperSurface>
    );
  }

  if (!authState) {
    return (
      <PaperSurface className="grain flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-md space-y-5 p-8 text-center">
          <h1 className="display text-[1.6rem]" style={{ color: "var(--vermilion)" }}>
            Authentication link expired
          </h1>
          <p className="text-[0.93rem]" style={{ color: "var(--ink-soft)" }}>
            Start sign-in again from the Lumina desktop app.
          </p>
        </div>
      </PaperSurface>
    );
  }

  if (!isSignedIn) {
    return (
      <PaperSurface className="grain flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <p className="mono mb-6 text-center" style={{ color: "var(--ink-faint)" }}>
            Connect this session to the desktop app
          </p>
          <SignIn
            appearance={clerkAuthAppearance}
            forceRedirectUrl={`/electron-auth?state=${encodeURIComponent(authState)}`}
            fallbackRedirectUrl={`/electron-auth?state=${encodeURIComponent(authState)}`}
          />
        </div>
      </PaperSurface>
    );
  }

  return (
    <PaperSurface className="grain flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-5 p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-9 w-9 animate-spin" style={{ color: "var(--vermilion)" }} />
            <h1 className="display text-[1.6rem]">Authenticating…</h1>
            <p className="text-[0.93rem]" style={{ color: "var(--ink-soft)" }}>
              Returning you to the desktop app.
            </p>
          </>
        )}

        {status === "redirecting" && (
          <>
            <CheckCircle2 className="mx-auto h-9 w-9" style={{ color: "var(--spruce)" }} />
            <h1 className="display text-[1.6rem]">Signed in.</h1>
            <p className="text-[0.93rem]" style={{ color: "var(--ink-soft)" }}>
              You can close this window and return to the Lumina app.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rule-link text-[0.85rem]"
                style={{ color: "var(--vermilion)" }}
              >
                Didn&apos;t redirect? Try again
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="display text-[1.6rem]" style={{ color: "var(--vermilion)" }}>
              Authentication error
            </h1>
            <p className="text-[0.93rem]" style={{ color: "var(--ink-soft)" }}>
              Something went wrong. Please try logging in again from the app.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mx-auto flex h-11 items-center border px-6 text-[0.9rem] font-medium transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderColor: "var(--ink)",
                boxShadow: "4px 4px 0 var(--vermilion)",
              }}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </PaperSurface>
  );
}
