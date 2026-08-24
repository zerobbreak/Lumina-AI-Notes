"use client";

import { useEffect, useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";

interface LoginButtonProps extends ButtonProps {
  mode?: "signin" | "signup";
  children: React.ReactNode;
}

export function LoginButton({ mode = "signin", children, ...props }: LoginButtonProps) {
  const [isElectron, setIsElectron] = useState(false);
  const { openSignIn, openSignUp } = useClerk();

  useEffect(() => {
    // Check if we are in Electron
    setIsElectron(typeof window !== "undefined" && "electronAPI" in window);
  }, []);

  const handleLogin = (e: React.MouseEvent) => {
    if (isElectron) {
      e.preventDefault();
      // @ts-ignore
      window.electronAPI.loginInBrowser();
    }
  };

  if (isElectron) {
    return (
      <Button {...props} onClick={handleLogin}>
        {children}
      </Button>
    );
  }

  // Fallback to standard web behavior (Link)
  const href = mode === "signin" ? "/sign-in" : "/sign-up";

  return (
    <Link href={href}>
      <Button {...props}>{children}</Button>
    </Link>
  );
}
