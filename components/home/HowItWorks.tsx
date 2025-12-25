"use client";

import { motion } from "framer-motion";
import { Mic, Zap, Brain, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Mic,
    title: "1. Capture",
    description:
      "Hit record. Lumina listens to your professor nicely, differentiating between key concepts, tangents, and important dates.",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    icon: Zap,
    title: "2. Process",
    description:
      "Gemini 1.5 Flash processes audio in real-time, identifying formulas, action items, and definitions instantly.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Brain,
    title: "3. Master",
    description:
      "Receive a structured Notion-style page with summaries, quizzes, and flashcards ready for studying.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            From Audio to{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-emerald-400">
              A+
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stop frantically typing. Start actually listening. Let Lumina handle
            the busy work.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-white/10 to-transparent -z-10" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="relative group"
            >
              <div
                className={`w-24 h-24 mx-auto mb-6 rounded-2xl ${step.bg} ${step.border} border flex items-center justify-center backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.3)]`}
              >
                <step.icon className={`w-10 h-10 ${step.color}`} />
              </div>

              <h3 className="text-xl font-semibold text-white text-center mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-center leading-relaxed">
                {step.description}
              </p>

              {idx < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute top-10 -right-6 w-6 h-6 text-white/20" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
