"use client";

import { motion } from "framer-motion";
import { Search, Sparkles, BookOpen, Clock, Play } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:mr-0 aspect-4/3 perspective-[2000px] pointer-events-none select-none">
      {/* Background Glows */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/20 rounded-full blur-[80px]"
      />

      {/* Main Container - Tilted slightly for 3D effect */}
      <motion.div
        initial={{ opacity: 0, y: 50, rotateX: 10, rotateY: -10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 grid grid-cols-12 gap-4 h-full"
      >
        {/* Left Card: The Lecture Note */}
        <Card className="col-span-8 row-span-2 overflow-hidden border-white/10 bg-[#0A0A0A]/60 backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 relative group">
          {/* Shine effect */}
          <div className="absolute inset-0 bg-linear-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          <CardHeader className="border-b border-white/5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-gray-300">Physics 301</span>
                <span>•</span>
                <span>Week 5</span>
              </div>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] h-5 px-2 font-mono uppercase tracking-wider"
              >
                Live
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-white mt-2 tracking-tight">
              Quantum Mechanics
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Last edited 2 mins ago
            </p>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">
                Wave-Particle Duality
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                The fundamental principle that quantum objects exhibit both wave
                properties and particle properties. This phenomenon was first
                observed in the double-slit experiment.
              </p>
            </div>

            {/* Highlighted Insight Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3.5 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-indigo-500/20">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                  AI Insight
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium">
                The de Broglie wavelength equation relates wavelength to
                momentum:{" "}
                <span className="font-mono text-indigo-300">λ = h/p</span>
              </p>
            </motion.div>

            {/* Simulated User Question */}
            <div className="relative mt-2">
              <div className="absolute -inset-0.5 rounded-lg bg-linear-to-r from-purple-500 to-blue-500 opacity-20 blur"></div>
              <div className="relative flex items-center gap-3 rounded-lg bg-black/80 px-3 py-2.5 border border-white/10 shadow-lg">
                <div className="h-5 w-5 rounded-full bg-linear-to-br from-purple-400 to-blue-500 ring-2 ring-black" />
                <span className="text-xs text-gray-300 font-medium">
                  Explain the relationship to wavelength?
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Audio Visualization */}
        <div className="col-span-4 flex flex-col gap-4">
          <Card className="flex-1 overflow-hidden border-white/10 bg-[#0A0A0A]/60 backdrop-blur-xl ring-1 ring-white/5">
            <div className="h-full flex flex-col justify-center items-center p-4">
              {/* Fake Waveform */}
              <div className="flex items-center gap-1 h-12 mb-4">
                {[1, 3, 2, 5, 8, 4, 6, 9, 3, 5, 2, 4, 7, 4, 2].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [h * 2, h * 4, h * 2],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-1 bg-linear-to-t from-purple-500 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    style={{ height: h * 3 }}
                  />
                ))}
              </div>

              <div className="w-full bg-white/5 rounded-full p-1.5 flex items-center gap-2 border border-white/5">
                <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                  <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
                </div>
                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "45%" }}
                    transition={{ duration: 20, ease: "linear" }}
                    className="h-full bg-purple-500"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mr-1 font-mono">
                  10:42
                </span>
              </div>
            </div>
          </Card>

          {/* Bottom Right: Quick Actions */}
          <Card className="h-28 border-white/10 bg-[#0A0A0A]/60 backdrop-blur-xl p-3 flex flex-col justify-center gap-3 ring-1 ring-white/5">
            <div className="flex items-center gap-2 text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-1 rounded-md w-fit">
              <Clock className="w-3 h-3" />
              <span>Next Due: Friday</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs justify-start gap-2 h-9 border-white/10 hover:bg-white/5 hover:border-white/20 transition-all group"
            >
              <div className="w-2 h-2 rounded-full border border-gray-400 group-hover:bg-cyan-400 group-hover:border-cyan-400 transition-colors" />
              <span className="text-gray-300 group-hover:text-white">
                Problem Set 4
              </span>
            </Button>
          </Card>
        </div>

        {/* Global Search / Contextual Overlay positioned absolute or col-spanning */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6, ease: "backOut" }}
          className="absolute -bottom-6 left-6 right-6 z-20"
        >
          <div className="relative">
            <div className="absolute -inset-px rounded-xl bg-linear-to-r from-blue-500/50 to-purple-500/50 opacity-50 blur-lg animate-pulse"></div>
            <div className="relative flex items-center gap-3 rounded-xl border border-white/20 bg-[#0F172A]/90 px-4 py-4 shadow-2xl backdrop-blur-xl">
              <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
              <Input
                className="border-0 bg-transparent p-0 text-sm placeholder:text-gray-400 focus-visible:ring-0 h-auto font-light"
                placeholder="Ask Gemini about the lecture..."
                readOnly
              />
              <div className="flex items-center gap-1">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-gray-400">
                  <span className="text-xs">⌘</span>K
                </kbd>
                <Button
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white h-7 text-xs rounded-lg ml-1"
                >
                  Enter
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
