"use client";

import { motion } from "framer-motion";
import { Search, Sparkles, BookOpen, Clock, Play } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:mr-0 aspect-4/3 perspective-[2000px]">
      {/* Background Glows */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Container - Tilted slightly for 3D effect */}
      <motion.div
        initial={{ opacity: 0, y: 50, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 grid grid-cols-12 gap-4 h-full"
      >
        {/* Left Card: The Lecture Note */}
        <Card className="col-span-8 row-span-2 overflow-hidden border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="w-3 h-3" />
                <span>Physics 301</span>
                <span>•</span>
                <span>Week 5</span>
              </div>
              <Badge
                variant="glass"
                className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] h-5"
              >
                Live
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white mt-1">
              Quantum Mechanics Lecture
            </h3>
            <p className="text-xs text-muted-foreground">
              Last edited 2 mins ago
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-white mb-1">
                Wave-Particle Duality
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                The fundamental principle that quantum objects exhibit both wave
                properties and particle properties. This phenomenon was first
                observed in the double-slit experiment.
              </p>
            </div>

            {/* Highlighted Insight Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-indigo-500/20">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-xs font-semibold text-indigo-300">
                  Lumina Insight
                </span>
              </div>
              <p className="text-xs text-indigo-100">
                The de Broglie wavelength equation relates wavelength to
                momentum: λ = h/p
              </p>
            </motion.div>

            {/* Simulated User Question */}
            <div className="relative mt-2">
              <div className="absolute -inset-0.5 rounded-lg bg-linear-to-r from-purple-500 to-blue-500 opacity-30 blur"></div>
              <div className="relative flex items-center gap-2 rounded-lg bg-black px-3 py-2 border border-white/10">
                <div className="h-4 w-4 rounded-full bg-linear-to-b from-purple-400 to-blue-500" />
                <span className="text-xs text-gray-300">
                  Explain the relationship to wavelength?
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Audio Visualization */}
        <div className="col-span-4 flex flex-col gap-4">
          <Card className="flex-1 overflow-hidden border-white/10 bg-[#0A0A0A]/40 backdrop-blur-md">
            <div className="h-full flex flex-col justify-center items-center p-4">
              {/* Fake Waveform */}
              <div className="flex items-center gap-1 h-8 mb-4">
                {[1, 3, 2, 5, 8, 4, 6, 9, 3, 5, 2, 4, 7, 4, 2].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [h * 2, h * 4, h * 2] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                    className="w-1 bg-linear-to-t from-purple-500 to-pink-500 rounded-full"
                    style={{ height: h * 3 }}
                  />
                ))}
              </div>

              <div className="w-full bg-white/5 rounded-full p-1 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-3 h-3 text-white fill-current" />
                </div>
                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-purple-500" />
                </div>
                <span className="text-[10px] text-muted-foreground mr-1">
                  10:42
                </span>
              </div>
            </div>
          </Card>

          {/* Bottom Right: Quick Actions */}
          <Card className="h-24 border-white/10 bg-[#0A0A0A]/40 backdrop-blur-md p-3 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Next Due: Friday</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs justify-start gap-2 h-7 border-white/10 hover:bg-white/5"
            >
              <div className="w-2 h-2 rounded-full border border-gray-400" />
              Problem Set 4
            </Button>
          </Card>
        </div>

        {/* Global Search / Contextual Overlay positioned absolute or col-spanning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute -bottom-6 left-8 right-8 z-20"
        >
          <div className="relative">
            <div className="absolute -inset-px rounded-xl bg-linear-to-r from-blue-500/50 to-purple-500/50 opacity-70 blur-md"></div>
            <div className="relative flex items-center gap-3 rounded-xl border border-white/20 bg-black/80 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
              <Input
                className="border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 h-auto"
                placeholder="Ask Gemini about the lecture..."
              />
              <Button
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white h-7 text-xs"
              >
                Enter
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
