"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent to-indigo-950/20 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
          Ready to Ace Your Semester?
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Join thousands of students who have swapped stress for strategy. Get
          your first 5 lectures processed for free.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="h-14 px-8 text-lg bg-white text-black hover:bg-gray-100 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform hover:scale-105"
          >
            <Sparkles className="mr-2 h-5 w-5 text-purple-600" />
            Start My Free Trial
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-14 px-8 text-lg text-gray-400 hover:text-white rounded-full"
          >
            View Pricing <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
