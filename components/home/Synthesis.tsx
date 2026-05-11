"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { BrainCircuit, Hexagon, Waypoints } from "lucide-react";

const noteStyles = [
  {
    name: "Cornell Matrix",
    badge: "CRN-SYS",
    icon: Waypoints,
    accent: "var(--obs-amber)",
    content: {
      cue: "What triggers an action potential?",
      notes: "Threshold stimulus → voltage-gated Na⁺ channels open → rapid depolarization → K⁺ channels open → repolarization → refractory period prevents backflow.",
      summary: "Action potentials follow an all-or-nothing depolarization-repolarization cycle governed by voltage-gated ion channels.",
    },
  },
  {
    name: "Hierarchical Outline",
    badge: "OTL-TREE",
    icon: Hexagon,
    accent: "var(--obs-teal)",
    content: {
      cue: "I. Cell Membrane Transport",
      notes: "  A. Passive Transport\n    1. Diffusion — movement along gradient\n    2. Osmosis — water-specific\n  B. Active Transport\n    1. Na⁺/K⁺ pump — against gradient\n    2. Vesicular transport — bulk movement",
      summary: "Transport mechanisms classified by energy requirement and substrate specificity.",
    },
  },
  {
    name: "Neural Graph",
    badge: "MAP-NET",
    icon: BrainCircuit,
    accent: "#818cf8",
    content: {
      cue: "Central: Photosynthesis",
      notes: "→ Light Reactions (Thylakoid) → NADPH, ATP\n→ Calvin Cycle (Stroma) → G3P → Glucose\n→ Inputs: CO₂, H₂O, Light\n→ Outputs: O₂, Glucose",
      summary: "Photosynthesis branches into light-dependent and light-independent reactions linked by energy carriers.",
    },
  },
];

export function Synthesis() {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = noteStyles[activeIdx];

  return (
    <section className="relative py-32 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-start gap-16 lg:gap-24">
          
          {/* Left: Text & Controls */}
          <div className="flex-1 max-w-lg lg:sticky lg:top-40">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 mb-6"
            >
              <div className="h-px w-8 bg-gradient-to-r from-indigo-500 to-transparent" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-indigo-400">
                Cognitive Assembly
              </p>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.04em] mb-8 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              One Input.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-teal-400 to-amber-400">
                Infinite Structures.
              </span>
            </motion.h2>
            <p className="text-xl leading-relaxed mb-10 text-gray-400 font-light" style={{ fontFamily: 'var(--font-body)' }}>
              Lumina doesn't just format text. It understands meaning and reconstructs knowledge into the optimal cognitive architecture for your brain.
            </p>

            {/* Style tabs */}
            <div className="flex flex-col gap-3">
              {noteStyles.map((style, idx) => (
                <button
                  key={style.name}
                  onClick={() => setActiveIdx(idx)}
                  className="flex items-center justify-between p-4 rounded-xl transition-all duration-500 w-full text-left group"
                  style={{
                    background: activeIdx === idx ? `${style.accent}15` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${activeIdx === idx ? `${style.accent}40` : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500"
                      style={{ background: activeIdx === idx ? `${style.accent}20` : 'rgba(255,255,255,0.05)' }}
                    >
                      <style.icon className="h-5 w-5" style={{ color: activeIdx === idx ? style.accent : '#94a3b8' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{style.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-mono">{style.badge}</p>
                    </div>
                  </div>
                  {activeIdx === idx && (
                    <motion.div layoutId="active-indicator" className="w-2 h-2 rounded-full" style={{ background: style.accent, boxShadow: `0 0 10px ${style.accent}` }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Holographic UI */}
          <div className="flex-1 w-full relative">
            {/* Massive ambient glow changing based on active style */}
            <motion.div
              animate={{ background: `radial-gradient(circle at 50% 50%, ${active.accent}30, transparent 70%)` }}
              transition={{ duration: 1 }}
              className="absolute -inset-20 blur-[60px] opacity-60 mix-blend-screen pointer-events-none -z-10 rounded-full"
            />
            
            <div className="relative rounded-[2rem] overflow-hidden glass-dark border border-white/10 shadow-2xl bg-black/40 backdrop-blur-3xl min-h-[500px]">
              
              {/* Sci-Fi Grid Overlay inside the card */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                   style={{ 
                     backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                     backgroundSize: '2rem 2rem'
                   }} 
              />

              <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/40">
                <div className="flex items-center gap-3">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm border"
                    style={{ background: `${active.accent}15`, color: active.accent, borderColor: `${active.accent}30` }}
                  >
                    {active.badge}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Synthesizing...</span>
                </div>
                <div className="flex gap-1.5 opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                </div>
              </div>

              <div className="p-8 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.name}
                    initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                  >
                    {/* Floating connection lines simulating AI thinking */}
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-20 pointer-events-none">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <motion.circle cx="50" cy="50" r="40" fill="none" stroke={active.accent} strokeWidth="0.5" strokeDasharray="2 4" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
                        <motion.circle cx="50" cy="50" r="20" fill="none" stroke={active.accent} strokeWidth="0.5" strokeDasharray="1 3" animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} />
                      </svg>
                    </div>

                    <div className="relative z-10 space-y-8 font-mono">
                      <div className="group">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 mb-2" style={{ color: active.accent }}>
                          <span className="w-3 h-[1px]" style={{ background: active.accent }} />
                          {active.name === "Cornell Matrix" ? "Entity_Cue" : active.name === "Hierarchical Outline" ? "Root_Node" : "Central_Cluster"}
                        </span>
                        <p className="text-lg text-white font-medium bg-white/5 p-4 rounded-xl border border-white/5">{active.content.cue}</p>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 mb-2 relative z-10" style={{ color: active.accent }}>
                          <span className="w-3 h-[1px]" style={{ background: active.accent }} />
                          Extracted_Data
                        </span>
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap text-gray-300 bg-black/40 p-6 rounded-xl border border-white/5 shadow-inner ml-8 relative">
                          {active.content.notes}
                        </pre>
                      </div>
                      
                      <div className="pt-4 border-t border-white/10">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 mb-2 text-gray-500">
                          <span className="w-3 h-[1px] bg-gray-500" />
                          Semantic_Summary
                        </span>
                        <p className="text-sm leading-relaxed text-gray-400 italic">
                          " {active.content.summary} "
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
