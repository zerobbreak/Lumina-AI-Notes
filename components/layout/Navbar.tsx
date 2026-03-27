"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { LoginButton } from "@/components/auth/LoginButton";

export function Navbar() {
  const router = useRouter();

  const handleDashboardHover = () => {
    router.prefetch("/dashboard");
  };
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(20px)' }}>
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            <span style={{ color: 'var(--obs-amber)' }}>Note</span>AI
          </span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium transition-colors hover:text-white"
            style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
          >
            Features
          </Link>
          <Link
            href="#pipeline"
            className="text-sm font-medium transition-colors hover:text-white"
            style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
          >
            Pipeline
          </Link>
          <Link
            href="#roadmap"
            className="text-sm font-medium transition-colors hover:text-white"
            style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
          >
            Roadmap
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Show when user is NOT signed in */}
          <SignedOut>
            <LoginButton
              variant="ghost"
              className="hidden text-gray-300 hover:text-white sm:flex font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Log in
            </LoginButton>
            <LoginButton
              mode="signup"
              variant="default"
              className="border-0 rounded-full px-6 font-semibold text-black"
              style={{ background: 'var(--obs-amber)', fontFamily: 'var(--font-display)' }}
            >
              Sign Up
            </LoginButton>
          </SignedOut>

          {/* Show when user IS signed in */}
          <SignedIn>
            <Link href="/dashboard" prefetch={true} onMouseEnter={handleDashboardHover}>
              <Button
                variant="default"
                className="text-black border-0"
                style={{ background: 'var(--obs-amber)', boxShadow: '0 0 20px var(--obs-amber-glow)', fontFamily: 'var(--font-display)' }}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
