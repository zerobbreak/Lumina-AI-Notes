"use client";

import { motion } from "framer-motion";
import {
  Mic,
  FileText,
  Users,
  Brain,
  Layout,
  Sparkles,
  ArrowRight,
  Zap,
  GraduationCap,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils"; // Ensure you have a utils file or remove if not standard, I'll assume standard shadcn setup usually implies it, but I'll avoid it if unsure. I will check for utils.
// Actually, checking for utils first is safer. But I'll stick to standard CSS/Tailwind classes to be safe.

const features = [
  {
    icon: Mic,
    title: "Voice-to-Note",
    description:
      "Record full lectures and get instant, accurate transcripts with AI-generated summaries and key takeaways.",
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-cyan-400",
    delay: 0.1,
    colSpan: "md:col-span-2",
  },
  {
    icon: MessageSquareText,
    title: "PDF Conversations",
    description:
      "Upload textbooks and handouts. Chat with your documents to find answers, extract quotes, and summarize chapters instantly.",
    color: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
    delay: 0.2,
    colSpan: "md:col-span-1",
  },
  {
    icon: Brain,
    title: "Smart Flashcards",
    description:
      "Turn any note into a study deck. Our AI identifies key concepts and creates spaced-repetition cards automatically.",
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
    delay: 0.3,
    colSpan: "md:col-span-1",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Work together on group projects. Multiplayer editing lets you see cursors and changes as they happen live.",
    color: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-emerald-400",
    delay: 0.4,
    colSpan: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Instant Quizzes",
    description:
      "Test your knowledge before the real exam. Generate practice questions from your notes with detailed explanations.",
    color: "from-rose-500/20 to-red-500/20",
    iconColor: "text-rose-400",
    delay: 0.5,
    colSpan: "md:col-span-1",
  },
  {
    icon: Layout,
    title: "Structured Learning",
    description:
      "Support for Cornell Notes, Outlines, and Mind Maps. Auto-organized by your semester, major, and courses.",
    color: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-400",
    delay: 0.6,
    colSpan: "md:col-span-2",
  },
];

export function SmarterStudyTools() {
  return (
    <section
      className="py-32 relative overflow-hidden bg-[#020817]"
      id="features"
    >
      {/* Background Elements */}
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-slate-900/0" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="mb-20 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400 mb-8 backdrop-blur-md shadow-lg shadow-cyan-500/20"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Designed for the Modern Student
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Everything you need to <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-500 to-purple-600">
              crush your semester
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 leading-relaxed"
          >
            Lumina combines powerful AI with intuitive organization. Stop
            juggling five different apps and start learning smarter.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr mb-16">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: feature.delay,
                duration: 0.5,
              }}
              viewport={{ once: true }}
              className={`
                group relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] p-8 
                hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300
                ${feature.colSpan || "md:col-span-1"}
              `}
            >
              {/* Hover Gradient Background */}
              <div
                className={`absolute inset-0 bg-linear-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}
              />

              <div className="relative z-10 flex flex-col h-full">
                <div
                  className={`h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-none group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300 ${feature.iconColor}`}
                >
                  <feature.icon className="h-7 w-7" />
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-cyan-50 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base group-hover:text-gray-300 transition-colors">
                  {feature.description}
                </p>

                {/* Subtle sheen effect on hover */}
                <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          <Link
            href="/sign-up"
            className="group relative flex items-center gap-2 rounded-full px-8 py-4 bg-white text-black font-bold text-base hover:bg-cyan-50 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
          >
            <GraduationCap className="h-5 w-5" />
            Step Up Your Grades Now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
