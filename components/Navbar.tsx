"use client";

import Link from "next/link";
import { Mic, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Lumina AI
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#templates"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-white"
          >
            Templates
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-white"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Show when user is NOT signed in */}
          <SignedOut>
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="hidden text-muted-foreground hover:text-white sm:flex"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                <Mic className="mr-2 h-4 w-4" /> Record
              </Button>
            </Link>
          </SignedOut>

          {/* Show when user IS signed in */}
          <SignedIn>
            <Link href="/dashboard">
              <Button
                variant="default"
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
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
