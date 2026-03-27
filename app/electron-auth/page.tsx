"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ElectronAuthPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");

  useEffect(() => {
    async function handleAuth() {
      if (isLoaded && isSignedIn) {
        setStatus("redirecting");
        try {
          // Get a JWT for the custom protocol
          const token = await getToken();
          if (token) {
            // Redirect back to the Electron app
            window.location.href = `lumina-notes://auth?token=${token}`;
            
            // Give it a moment before showing success/instructions
            setTimeout(() => {
              setStatus("redirecting");
            }, 2000);
          }
        } catch (error) {
          console.error("Failed to get token:", error);
          setStatus("error");
        }
      }
    }

    handleAuth();
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-secondary/30 backdrop-blur-md border border-border p-8 rounded-2xl shadow-xl text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Authenticating...</h1>
            <p className="text-muted-foreground">
              Please complete the login process in this window.
            </p>
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
                onClick={() => window.location.reload()}
                className="text-primary hover:underline text-sm"
              >
                Didn't redirect? Try again
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
