"use client";

import {
  X,
  Check,
  Laptop,
  ScrollText,
  Sparkles,
  Search,
  Brain,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ComparisonBento() {
  return (
    <section className="py-24 bg-black/40 border-y border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <Badge
            variant="glass"
            className="mb-4 px-3 py-1 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          >
            Why Switch?
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            The Old Way vs. <span className="text-indigo-400">Lumina AI</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-6 max-w-6xl mx-auto">
          {/* THE OLD WAY (Left Column - Spans 4 cols on Desktop) */}
          <Card className="md:col-span-4 h-full bg-red-950/20 border-red-500/10 backdrop-blur-sm flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <ScrollText className="w-6 h-6 text-red-400" />
                </div>
                <CardTitle className="text-red-100">Manual Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <p className="text-red-200/60 text-sm">
                The struggle of trying to keep up with the professor while
                missing the actual concepts.
              </p>
              <div className="space-y-4">
                {[
                  "Frantically typing everything",
                  "Bad formatting & typos",
                  "Disorganized Google Docs",
                  "Zero connection between lectures",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-red-200/60 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-8 flex justify-center opacity-30">
                <ScrollText className="w-32 h-32 text-red-500/20" />
              </div>
            </CardContent>
          </Card>

          {/* THE LUMINA WAY (Right Grid - Spans 8 cols) */}
          <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature 1: The Brain (Top Wide) */}
            <Card className="md:col-span-2 bg-indigo-950/20 border-indigo-500/20 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-indigo-50">Lumina Brain</CardTitle>
                </div>
                <CardDescription className="text-indigo-200/70">
                  Active listening engine that captures nuance, not just words.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">
                    Real-time formula rendering (LaTeX)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">
                    Context-aware summaries
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2: Semantic Search (Bottom Left) */}
            <Card className="bg-blue-950/20 border-blue-500/20 backdrop-blur-sm flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-base text-blue-100">
                    Semantic Search
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    placeholder="Ask about 'Mitochondria'..."
                    className="bg-black/40 border-blue-500/20 text-xs h-8"
                    disabled
                  />
                  <Sparkles className="absolute right-2 top-2 w-4 h-4 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            {/* Feature 3: Auto Quizzes (Bottom Right) */}
            <Card className="bg-purple-950/20 border-purple-500/20 backdrop-blur-sm flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-purple-400" />
                  <CardTitle className="text-base text-purple-100">
                    Auto-Quizzes
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20">
                    <span className="text-xs text-purple-200">
                      Retention Score
                    </span>
                    <span className="text-xs font-bold text-purple-400">
                      98%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
