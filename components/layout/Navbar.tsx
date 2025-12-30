"use client";

import Link from "next/link";
import { Mic, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#020817]/70 backdrop-blur-md supports-backdrop-filter:bg-[#020817]/30 transition-all duration-300">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div> */}
          <span className="text-xl font-bold tracking-tight text-white">
            <span className="text-cyan-400">Note</span>AI
          </span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="#about"
            className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            About
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {/* Show when user is NOT signed in */}
          <SignedOut>
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="hidden text-gray-300 hover:text-white sm:flex font-medium"
              >
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button
                variant="default"
                className="bg-cyan-400 hover:bg-cyan-500 text-black border-0 rounded-full px-6 font-semibold"
              >
                Sign Up
              </Button>
            </Link>
          </SignedOut>

          {/* Show when user IS signed in */}
          <SignedIn>
            <Link href="/dashboard">
              <Button
                variant="default"
                className="bg-cyan-600 hover:bg-cyan-700 text-white border-0 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
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
