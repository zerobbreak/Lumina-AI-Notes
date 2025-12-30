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
    <section
      className="py-24 relative overflow-hidden bg-linear-to-b from-[#020817] to-indigo-950/20"
      id="features"
    >
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="mb-20 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 mb-6 backdrop-blur-sm">
            <Sparkles className="mr-2 h-3 w-3" />
            Supercharge Your Workflow
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Smarter Study Tools for <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-500">
              Top Performers
            </span>
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            Everything you need to crush your semester, all in one place. We
            handle the organization, you handle the learning.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1,
                duration: 0.6,
                ease: "easeOut",
              }}
              viewport={{ once: true }}
              className={`
                group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/10 hover:-translate-y-1
                ${index === 1 ? "md:row-span-2 bg-linear-to-b from-white/5 to-cyan-900/10" : ""}
              `}
            >
              <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-[#0A0A0A] border border-white/10 flex items-center justify-center text-cyan-400 mb-6 shadow-xl group-hover:scale-110 group-hover:border-cyan-500/30 transition-all duration-300">
                  <feature.icon className="h-7 w-7" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-100 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>
              </div>

              {/* Decorative background visual for the bento feel */}
              {index === 1 && (
                <div className="absolute bottom-[-20px] right-[-20px] opacity-20 rotate-[-15deg] group-hover:rotate-[-10deg] transition-transform duration-500">
                  <BookOpen className="w-40 h-40 text-cyan-500" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/features"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-cyan-500/30"
          >
            Explore all features
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
