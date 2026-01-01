"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
        {/* glitched text effect container */}
        <div className="relative">
          <h1 className="text-[150px] font-black leading-none bg-clip-text text-transparent bg-linear-to-b from-white to-white/10 select-none">
            404
          </h1>
          <div className="absolute inset-0 bg-clip-text text-transparent bg-white/5 blur-xl select-none">
            404
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Page Not Found</h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            The note you're looking for might have been moved, deleted, or never
            existed in this dimension.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[160px] h-12 rounded-full text-base font-medium shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <Link href="/dashboard">
              <Home className="w-5 h-5 mr-2" />
              Return Home
            </Link>
          </Button>

          <Button
            variant="ghost"
            asChild
            className="text-gray-400 hover:text-white hover:bg-white/5 min-w-[160px] h-12 rounded-full text-base"
          >
            <Link href="#" onClick={() => history.back()}>
              <MoveLeft className="w-5 h-5 mr-2" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-20" />
    </div>
  );
}
