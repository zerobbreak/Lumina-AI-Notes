"use client";

import { X, Check, Laptop, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComparisonSection() {
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

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* The Old Way */}
          <Card className="bg-red-950/20 border-red-500/10 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <ScrollText className="w-6 h-6 text-red-400" />
                </div>
                <CardTitle className="text-red-100">
                  Manuel Note Taking
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Frantically trying to type everything said.",
                "Missing key points while formatting.",
                "Unorganized Google Docs folder.",
                "Hours spent converting notes to flashcards.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-red-200/60 text-sm">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* The Lumina Way */}
          <Card className="bg-indigo-950/20 border-indigo-500/20 backdrop-blur-sm relative overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                  <Laptop className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-indigo-50">The Lumina Way</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              {[
                "Active listening while AI captures details.",
                "Perfectly structured Notion-style pages.",
                "Semantic Search across all classes.",
                "Auto-generated Quizzes & Flashcards.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="rounded-full bg-green-500/20 p-0.5">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <span className="text-indigo-100/90 text-sm font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
