"use client";

import { motion } from "framer-motion";
import { Mic, FileText, Sparkles, Brain, Search, Share2, Layers, GraduationCap } from "lucide-react";

const features = [
  {
    title: "AI Note Generation",
    description: "Drop a lecture, PDF, or raw audio. Gemini-2.5 Flash extracts and structures your notes in seconds — Cornell, outline, or mind map.",
    icon: Sparkles,
    accent: "var(--obs-amber)",
    span: "col-span-2 row-span-2",
    size: "large",
  },
  {
    title: "Smart Flashcards",
    description: "Auto-generated flashcards from your notes. Spaced repetition that adapts to how you learn.",
    icon: Layers,
    accent: "var(--obs-teal)",
    span: "col-span-1 row-span-1",
    size: "small",
  },
  {
    title: "Adaptive Quizzes",
    description: "AI-crafted questions targeting your weak areas. Performance tracking over time.",
    icon: GraduationCap,
    accent: "#a78bfa",
    span: "col-span-1 row-span-1",
    size: "small",
  },
  {
    title: "Semantic Search",
    description: "Forgot where you mentioned 'Quantum Entanglement'? Just ask. Lumina understands context, not just keywords.",
    icon: Search,
    accent: "var(--obs-amber)",
    span: "col-span-2 row-span-1",
    size: "wide",
  },
  {
    title: "Real-time Collaboration",
    description: "Study together. Live cursors, shared notes, and presence indicators make group work seamless.",
    icon: Share2,
    accent: "var(--obs-teal)",
    span: "col-span-1 row-span-1",
    size: "small",
  },
  {
    title: "PDF & Audio Intake",
    description: "Upload PDFs or record lectures directly. Lumina transcribes, extracts, and maps it all.",
    icon: Mic,
    accent: "#f59e0b",
    span: "col-span-1 row-span-1",
    size: "small",
  },
];

export function FeatureFlow() {
  return (
    <section id="features" className="relative py-28 overflow-hidden" style={{ background: 'var(--obs-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.25em] font-semibold mb-4"
            style={{ color: 'var(--obs-amber)', fontFamily: 'var(--font-display)' }}
          >
            What You Can Do
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.03em] mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Built for How
            <br />
            <span className="observatory-text">You Actually Study</span>
          </motion.h2>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
            Six integrated capabilities. One intelligent system. No more juggling apps.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              className={`${feature.span} group relative overflow-hidden rounded-2xl cursor-default transition-all duration-500`}
              style={{ 
                background: 'var(--obs-surface)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Hover glow */}
              <div 
                className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl pointer-events-none"
                style={{ background: feature.accent, opacity: 0 }}
              />
              <div 
                className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-[0.08] transition-opacity duration-700 blur-2xl pointer-events-none"
                style={{ background: feature.accent }}
              />

              <div className="relative h-full p-6 md:p-8 flex flex-col justify-between z-10">
                <div>
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110"
                    style={{ background: `${feature.accent}15`, border: `1px solid ${feature.accent}25` }}
                  >
                    <feature.icon className="h-5 w-5" style={{ color: feature.accent }} />
                  </div>
                  <h3 
                    className="text-lg font-bold text-white tracking-tight mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
                    {feature.description}
                  </p>
                </div>

                {/* Feature-specific micro visual */}
                {feature.size === "large" && (
                  <div className="mt-4 flex items-center gap-3">
                    {["Cornell", "Outline", "Mind Map"].map((style) => (
                      <span 
                        key={style}
                        className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-semibold"
                        style={{ background: `${feature.accent}12`, color: feature.accent, border: `1px solid ${feature.accent}20` }}
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                )}

                {feature.size === "wide" && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-8 rounded-lg flex items-center px-3 gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Search className="h-3 w-3" style={{ color: 'var(--obs-text-dim)' }} />
                      <span className="text-xs" style={{ color: 'var(--obs-text-dim)' }}>Search across all notes...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Border hover effect */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: `1px solid ${feature.accent}30` }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
