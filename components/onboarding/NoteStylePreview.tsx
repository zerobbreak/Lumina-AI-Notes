"use client";

import { cn } from "@/lib/utils";

interface NoteStylePreviewProps {
  style: "cornell" | "outline" | "mindmap";
  isActive?: boolean;
}

export function NoteStylePreview({ style, isActive }: NoteStylePreviewProps) {
  // Render different preview layouts based on style

  if (style === "cornell") {
    return (
      <div className="w-full h-32 bg-white/5 rounded-lg border border-white/10 p-2 flex relative">
        {/* Left: Cue Column */}
        <div className="w-1/4 border-r border-white/10 pr-2 space-y-1">
          <div className="h-2 w-full bg-indigo-500/30 rounded" />
          <div className="h-2 w-3/4 bg-indigo-500/20 rounded" />
        </div>
        {/* Right: Notes Area */}
        <div className="flex-1 pl-2 space-y-1">
          <div className="h-2 w-full bg-white/20 rounded" />
          <div className="h-2 w-5/6 bg-white/15 rounded" />
          <div className="h-2 w-4/5 bg-white/15 rounded" />
          <div className="h-2 w-full bg-white/20 rounded" />
        </div>
        {/* Bottom: Summary */}
        <div className="absolute bottom-2 left-2 right-2 h-4 border-t border-white/10 pt-1">
          <div className="h-2 w-1/2 bg-purple-500/30 rounded" />
        </div>
      </div>
    );
  }

  if (style === "outline") {
    return (
      <div className="w-full h-32 bg-white/5 rounded-lg border border-white/10 p-3 space-y-2">
        {/* Hierarchical bullets */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <div className="h-2 w-3/4 bg-white/20 rounded" />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-1 h-1 rounded-full bg-white/40" />
          <div className="h-2 w-2/3 bg-white/15 rounded" />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-1 h-1 rounded-full bg-white/40" />
          <div className="h-2 w-1/2 bg-white/15 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <div className="h-2 w-4/5 bg-white/20 rounded" />
        </div>
      </div>
    );
  }

  if (style === "mindmap") {
    return (
      <div className="w-full h-32 bg-white/5 rounded-lg border border-white/10 p-2 relative">
        {/* Central node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-indigo-500/40 rounded-full" />
        {/* Branches */}
        <div className="absolute top-4 left-1/4 w-8 h-4 bg-purple-500/30 rounded-full" />
        <div className="absolute top-4 right-1/4 w-10 h-4 bg-pink-500/30 rounded-full" />
        <div className="absolute bottom-4 left-1/3 w-9 h-4 bg-blue-500/30 rounded-full" />
        <div className="absolute bottom-4 right-1/3 w-7 h-4 bg-teal-500/30 rounded-full" />
        {/* Connection lines would be SVG in real implementation */}
      </div>
    );
  }

  return null;
}
