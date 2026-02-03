"use client";

import Link from "next/link";
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
            Join thousands of students transforming their grades today. Start
            your free trial now.
          </p>

          <div className="flex justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                className="h-14 px-10 bg-black text-white hover:bg-gray-900 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                Get Started for Free
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-black/60 font-medium">
            No credit card required for free tier.
          </p>
        </div>
      </div>
    </section>
  );
}
