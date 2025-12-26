"use client";

import { motion } from "framer-motion";
import { Sparkles, BookOpen, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Sparkles,
    title: "AI Intelligence",
    description:
      "Turn an hour lecture into a 5-minute read with instant AI summaries and flashcard generation.",
  },
  {
    icon: BookOpen,
    title: "Smart Syllabus",
    description:
      "Auto-organize notes by semester and subject automatically. Visual maps for your entire degree.",
  },
  {
    icon: Users,
    title: "Real-time Sync",
    description:
      "Collaborate on group projects with a multiplayer canvas. See changes as they happen.",
  },
];

export function SmarterStudyTools() {
  return (
    <section className="py-24 relative overflow-hidden" id="features">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Smarter Study Tools
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to crush your semester, all in one place. We
            handle the organization, you handle the learning.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors duration-300 relative group"
            >
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/features"
            className="flex items-center text-cyan-400 font-medium hover:text-cyan-300 transition-colors"
          >
            Explore all features <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
