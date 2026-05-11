"use client";

import { motion } from "framer-motion";
import { Mic, Search, Network, BrainCircuit, Sparkles, Fingerprint } from "lucide-react";

const features = [
  {
    title: "Vocal Extraction",
    description: "Raw audio streams converted into structured semantic data in real-time.",
    icon: Mic,
    accent: "var(--obs-amber)",
    span: "col-span-1 md:col-span-2 row-span-2",
    size: "large",
  },
  {
    title: "Neural Tagging",
    description: "Concepts are automatically identified and mapped.",
    icon: BrainCircuit,
    accent: "var(--obs-teal)",
    span: "col-span-1 row-span-1",
    size: "small",
  },
  {
    title: "Context Links",
    description: "Ideas organically connect forming a knowledge graph.",
    icon: Network,
    accent: "#818cf8",
    span: "col-span-1 row-span-1",
    size: "small",
  },
  {
    title: "Semantic Recall",
    description: "Search by meaning, not just keywords. The AI understands intent.",
    icon: Search,
    accent: "var(--obs-amber)",
    span: "col-span-1 md:col-span-2 row-span-1",
    size: "wide",
  },
  {
    title: "Thought Synthesis",
    description: "AI generates new insights from fragmented notes.",
    icon: Sparkles,
    accent: "var(--obs-teal)",
    span: "col-span-1 row-span-1",
    size: "small",
  },
  {
    title: "Identity Protection",
    description: "Encrypted memory distinct to your cognitive footprint.",
    icon: Fingerprint,
    accent: "#f59e0b",
    span: "col-span-1 row-span-1",
    size: "small",
  },
];

export function FeatureFlow() {
  return (
    <section id="features" className="relative py-32 overflow-hidden" style={{ background: 'transparent' }}>
      
      {/* Flowing background paths */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 200 Q 300 400 600 200 T 1200 400" fill="none" stroke="var(--obs-teal)" strokeWidth="1" opacity="0.3" />
          <path d="M 0 300 Q 400 100 800 400 T 1600 200" fill="none" stroke="var(--obs-amber)" strokeWidth="1" opacity="0.3" />
        </svg>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="h-px w-8 bg-gradient-to-r from-teal-500 to-transparent" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-teal-400">
              Intelligence in Motion
            </p>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.04em] mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Built for how you
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-teal-400">actually think.</span>
          </motion.h2>
          <p className="text-xl leading-relaxed text-gray-400 font-light" style={{ fontFamily: 'var(--font-body)' }}>
            Information flows continuously, organically structured by AI to match your cognitive patterns.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[200px]">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`${feature.span} group relative isolate overflow-hidden rounded-3xl cursor-default border border-white/10 bg-[#07090C]/60 transition-[transform,box-shadow,background-color,border-color] duration-500 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#07090C]/75 hover:shadow-[0_24px_70px_-38px_rgba(0,0,0,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20`}
            >
              {/* Background layers */}
              <div className="absolute inset-0 -z-10">
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: `radial-gradient(800px 500px at 20% 15%, ${feature.accent}14, transparent 55%)`,
                  }}
                />
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 40%, rgba(0,0,0,0.25) 100%)",
                  }}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:18px_18px] opacity-[0.08]" />
              </div>

              <div className="relative h-full p-8 flex flex-col">
                <div>
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-[1.06] group-hover:rotate-2 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.8)]"
                    style={{
                      background: `linear-gradient(135deg, ${feature.accent}26, rgba(255,255,255,0.02))`,
                      border: `1px solid ${feature.accent}2f`,
                    }}
                  >
                    <feature.icon className="h-6 w-6" style={{ color: feature.accent }} />
                  </div>
                  <h3 
                    className="text-[20px] font-bold text-white tracking-[-0.02em] mb-2.5 leading-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-white/55 font-light max-w-[36ch]">
                    {feature.description}
                  </p>
                </div>

                {/* Animated visual elements */}
                {feature.size === "large" && (
                  <div className="mt-auto pt-7">
                    <div className="flex items-center gap-2 overflow-hidden h-6 opacity-70">
                      <motion.div
                        animate={{ x: [-100, 300] }}
                        transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
                        className="w-10 h-px"
                        style={{
                          background: feature.accent,
                          boxShadow: `0 0 14px ${feature.accent}55`,
                        }}
                      />
                      <motion.div
                        animate={{ x: [-100, 300] }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.6,
                          ease: "linear",
                          delay: 0.55,
                        }}
                        className="w-6 h-px"
                        style={{
                          background: feature.accent,
                          boxShadow: `0 0 14px ${feature.accent}55`,
                        }}
                      />
                    </div>
                    <p className="mt-3 text-[10px] tracking-[0.22em] uppercase text-white/40">
                      live stream · structured signal
                    </p>
                  </div>
                )}

                {feature.size === "wide" && (
                  <div className="mt-auto pt-6 flex items-center gap-3">
                    <div className="flex-1 h-10 rounded-xl flex items-center px-4 gap-3 bg-white/5 border border-white/5 shadow-inner">
                      <Search className="h-4 w-4 text-amber-500/50" />
                      <span className="text-xs text-gray-500 font-mono tracking-wider">Search connections...</span>
                      <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-3 bg-amber-500/80 ml-auto" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
