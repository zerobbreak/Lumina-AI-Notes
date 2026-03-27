"use client";

import { motion } from "framer-motion";
import { FileUp, BrainCircuit, Map, NotebookPen, ArrowRight } from "lucide-react";

const steps = [
  { id: "UPL", label: "Upload", sub: "Lectures · PDFs · Audio", icon: FileUp, accent: "var(--obs-amber)" },
  { id: "EXT", label: "AI Extraction", sub: "Gemini 2.5 Flash", icon: BrainCircuit, accent: "var(--obs-teal)" },
  { id: "MAP", label: "Semantic Mapping", sub: "Vector Embeddings", icon: Map, accent: "#a78bfa" },
  { id: "OUT", label: "Structured Note", sub: "Cornell · Outline · Map", icon: NotebookPen, accent: "var(--obs-amber)" },
];

export function LiveProcessing() {
  return (
    <section id="pipeline" className="relative py-28 overflow-hidden" style={{ background: 'var(--obs-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs uppercase tracking-[0.25em] font-semibold mb-4"
            style={{ color: 'var(--obs-teal)', fontFamily: 'var(--font-display)' }}
          >
            The Pipeline
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.03em] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            From Chaos to <span className="observatory-text">Clarity</span>
          </motion.h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
            Watch how raw input transforms into structured knowledge in seconds.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-px hidden md:block" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(212,168,83,0.2) 20%, rgba(45,212,191,0.2) 80%, transparent 95%)', transform: 'translateY(-50%)' }} />

          {/* Scan line */}
          <div className="absolute top-1/2 h-px w-16 hidden md:block animate-scan-line" style={{ background: 'linear-gradient(90deg, transparent, var(--obs-amber), var(--obs-teal), transparent)', boxShadow: '0 0 20px var(--obs-amber-glow)', transform: 'translateY(-50%)' }} />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-10 md:gap-0">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col md:flex-row items-center gap-6 md:gap-0 flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 flex flex-col items-center will-change-transform"
                >
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 hover:scale-110"
                    style={{ 
                      background: 'var(--obs-surface)', 
                      border: `1px solid ${step.accent}25`,
                      boxShadow: `0 0 25px ${step.accent}10`
                    }}
                  >
                    <step.icon className="h-7 w-7" style={{ color: step.accent }} />
                  </div>
                  <div className="mt-4 text-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                      {step.label}
                    </h3>
                    <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: 'var(--obs-text-dim)' }}>
                      {step.sub}
                    </p>
                  </div>
                  {/* Node ID */}
                  <span className="text-[9px] mt-2 font-mono tracking-widest" style={{ color: 'var(--obs-muted)' }}>{step.id}</span>
                </motion.div>

                {idx < steps.length - 1 && (
                  <div className="hidden md:flex flex-1 items-center justify-center px-2">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + idx * 0.2, duration: 0.8 }}
                      className="h-px w-full origin-left"
                      style={{ background: `linear-gradient(90deg, ${step.accent}30, ${steps[idx + 1].accent}30)` }}
                    />
                    <ArrowRight className="h-3 w-3 shrink-0 -ml-2" style={{ color: 'var(--obs-muted)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
