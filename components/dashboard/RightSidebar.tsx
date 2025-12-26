"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  MoreVertical,
  Clock,
  Pin,
  Sparkles,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function RightSidebar() {
  const [isRecording, setIsRecording] = useState(true);

  return (
    <div className="w-[320px] h-screen bg-black/20 backdrop-blur-xl border-l border-white/5 flex flex-col shrink-0 z-50">
      {/* Top: Recorder Section */}
      <div className="p-6 border-b border-white/5 relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-50" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full z-10 relative" />
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-sm font-medium text-white tracking-wide">
              REC
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>00:14:23</span>
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="h-16 flex items-end justify-between gap-1 mb-6 opacity-80">
          {[40, 70, 30, 80, 50, 90, 30, 60, 40, 70, 50, 80, 40, 60, 30].map(
            (h, i) => (
              <motion.div
                key={i}
                animate={{ height: [h + "%", h * 0.5 + "%", h + "%"] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut",
                }}
                className="w-3 bg-indigo-500 rounded-full opacity-60"
                style={{ height: `${h}%` }}
              />
            )
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? (
              <Pause className="w-4 h-4 mr-2 fill-current" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRecording ? "Pause" : "Resume"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Middle: Transcript Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase">
            Live Transcript
          </h3>
          <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
            Syncing
          </span>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            <div className="group">
              <p className="text-sm text-gray-300 leading-relaxed mb-1">
                "The time complexity of this algorithm essentially boils down to
                how we partition the array..."
              </p>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-gray-600 font-mono">
                  14:15
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px] text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                >
                  <Pin className="w-3 h-3 mr-1" /> Pin as Block
                </Button>
              </div>
            </div>
            <div className="group">
              <p className="text-sm text-gray-300 leading-relaxed mb-1">
                "Remember, simpler solutions are often better for
                maintainability, even if they aren't the absolute fastest."
              </p>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-gray-600 font-mono">
                  14:20
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[10px] text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                >
                  <Pin className="w-3 h-3 mr-1" /> Pin as Block
                </Button>
              </div>
            </div>
            <div className="opacity-50">
              <p className="text-sm text-gray-300 leading-relaxed animate-pulse">
                "Now let's look at the recursive approach..."
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Bottom: Chat Input */}
      <div className="p-4 border-t border-white/5 bg-black/40">
        <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Ask Lumina
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Ask about the lecture..."
            className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
