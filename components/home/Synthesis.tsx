"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const noteStyles = [
  {
    name: "Cornell",
    badge: "CRN",
    accent: "var(--obs-amber)",
    content: {
      cue: "What triggers an action potential?",
      notes: "Threshold stimulus → voltage-gated Na⁺ channels open → rapid depolarization → K⁺ channels open → repolarization → refractory period prevents backflow.",
      summary: "Action potentials follow an all-or-nothing depolarization-repolarization cycle governed by voltage-gated ion channels.",
    },
  },
  {
    name: "Outline",
    badge: "OTL",
    accent: "var(--obs-teal)",
    content: {
      cue: "I. Cell Membrane Transport",
      notes: "  A. Passive Transport\n    1. Diffusion — movement along gradient\n    2. Osmosis — water-specific\n  B. Active Transport\n    1. Na⁺/K⁺ pump — against gradient\n    2. Vesicular transport — bulk movement",
      summary: "Transport mechanisms classified by energy requirement and substrate specificity.",
    },
  },
  {
    name: "Mind Map",
    badge: "MAP",
    accent: "#a78bfa",
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
    <section className="relative py-28 overflow-hidden" style={{ background: 'var(--obs-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-start gap-16 lg:gap-20">
          {/* Left: Text */}
          <div className="flex-1 max-w-lg lg:sticky lg:top-32">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs uppercase tracking-[0.25em] font-semibold mb-4"
              style={{ color: 'var(--obs-teal)', fontFamily: 'var(--font-display)' }}
            >
              The Synthesis Protocol
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              One Input,
              <br />
              <span className="observatory-text">Many Structures</span>
            </motion.h2>
            <p className="text-lg leading-relaxed mb-8" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
              AI shouldn&apos;t replace you — it should amplify you. Lumina transforms any raw content into the structure that fits your thinking style.
            </p>

            {/* Style tabs */}
            <div className="flex gap-2">
              {noteStyles.map((style, idx) => (
                <button
                  key={style.name}
                  onClick={() => setActiveIdx(idx)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: activeIdx === idx ? `${style.accent}18` : 'transparent',
                    border: `1px solid ${activeIdx === idx ? `${style.accent}40` : 'rgba(255,255,255,0.06)'}`,
                    color: activeIdx === idx ? style.accent : 'var(--obs-text-dim)',
                  }}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Note Preview */}
          <motion.div 
            className="flex-1 w-full"
            key={active.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-2xl blur-[30px] opacity-10" style={{ background: active.accent }} />
              
              <div className="relative rounded-2xl overflow-hidden" style={{ background: 'var(--obs-surface)', border: `1px solid rgba(255,255,255,0.06)` }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{ background: `${active.accent}15`, color: active.accent }}
                    >
                      {active.badge}
                    </span>
                    <span className="text-sm font-medium text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      {active.name} Format
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5" style={{ fontFamily: 'var(--font-body)' }}>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: active.accent }}>
                      {active.name === "Cornell" ? "Cue" : active.name === "Outline" ? "Structure" : "Central Node"}
                    </span>
                    <p className="text-sm text-white font-medium">{active.content.cue}</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: active.accent }}>
                      {active.name === "Cornell" ? "Notes" : active.name === "Outline" ? "Hierarchy" : "Branches"}
                    </span>
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans" style={{ color: 'var(--obs-text)' }}>
                      {active.content.notes}
                    </pre>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                    <span className="text-[9px] uppercase tracking-widest font-bold block mb-1.5" style={{ color: 'var(--obs-text-dim)' }}>
                      Summary
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--obs-text-dim)' }}>
                      {active.content.summary}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
