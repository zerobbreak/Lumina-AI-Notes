"use client";

import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-linear-to-r from-cyan-500 to-blue-500 rounded-3xl p-12 md:p-24 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-black tracking-tight mb-6">
            Ready to Ace Your Semester?
          </h2>
          <p className="text-lg md:text-xl text-black/80 max-w-2xl mx-auto mb-10 font-medium">
            Join the waitlist today and get 3 months of Premium for free when we
            launch.
          </p>

          <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Enter your .edu email"
              className="flex-1 h-12 px-6 rounded-full bg-white/20 border border-black/10 text-black placeholder:text-black/50 focus:outline-none focus:ring-2 focus:ring-black/20"
              required
            />
            <Button
              size="lg"
              className="h-12 px-8 bg-black text-white hover:bg-gray-900 rounded-full font-semibold"
            >
              Get Early Access
            </Button>
          </form>
          <p className="mt-4 text-xs text-black/60 font-medium">
            No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
