"use client";

import { motion } from "framer-motion";
import { FileUp, BrainCircuit, Map, NotebookPen, ArrowRight, Radio, Fingerprint, Database, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

const steps = [
  { id: "AUDIO_STREAM", label: "Neural Audio Intake", sub: "Listening...", icon: Radio, accent: "var(--obs-teal)" },
  { id: "NLP_ENGINE", label: "Semantic Extraction", sub: "Gemini 2.5 Flash", icon: BrainCircuit, accent: "var(--obs-amber)" },
  { id: "VECTOR_DB", label: "Graph Embeddings", sub: "Clustering ideas", icon: Database, accent: "#818cf8" },
];

const liveLog = [
  "[00:01] ⚡ Stream initialized: Speaker 1 (User)",
  "[00:03] 🎙️ 'So the core concept here is...'",
  "[00:04] 🧠 Extracted Entity: [Core Concept]",
  "[00:07] 🎙️ 'Quantum superposition allows multiple states.'",
  "[00:08] 🔗 Linked to [Physics Node #302]",
  "[00:10] ✨ Generating summary block...",
];

export function LiveProcessing() {
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev + 1) % liveLog.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="pipeline" className="relative py-32 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
            Live Processing
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.04em] mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Watch Intelligence <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-teal-400">Unfold</span>
          </motion.h2>
          <p className="text-xl max-w-2xl mx-auto text-gray-400 font-light" style={{ fontFamily: 'var(--font-body)' }}>
            Raw thought enters. A structured, interconnected knowledge graph emerges. Real-time cognitive augmentation.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Main Interface Container */}
          <div className="relative rounded-3xl border border-white/10 bg-black/50 backdrop-blur-3xl overflow-hidden shadow-2xl">
            {/* Header bar */}
            <div className="h-12 border-b border-white/10 bg-white/5 flex items-center px-6 justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                Lumina Engine // v2.0.1
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
              
              {/* Left Column: Pipeline Steps */}
              <div className="p-8 space-y-8 relative">
                {/* Vertical connection line */}
                <div className="absolute left-14 top-16 bottom-16 w-px bg-gradient-to-b from-teal-500/30 via-amber-500/30 to-indigo-500/30" />
                
                {steps.map((step, idx) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2, duration: 0.6 }}
                    className="relative flex items-center gap-6"
                  >
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${step.accent}20, transparent)`, border: `1px solid ${step.accent}40` }}
                    >
                      <step.icon className="h-5 w-5" style={{ color: step.accent }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                        {step.label}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-mono">
                        {step.sub}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Middle Column: Terminal Log */}
              <div className="p-8 bg-black/40 relative">
                <div className="absolute top-0 right-0 p-4">
                  <span className="flex items-center gap-2 text-[10px] font-mono text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    STREAM: ACTIVE
                  </span>
                </div>
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-6">Processing Log</h4>
                <div className="space-y-3 font-mono text-xs">
                  {liveLog.map((log, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: idx <= logIndex ? (idx === logIndex ? 1 : 0.5) : 0,
                        y: idx <= logIndex ? 0 : 10
                      }}
                      className={`${idx === logIndex ? 'text-teal-300' : 'text-gray-500'}`}
                    >
                      {log}
                    </motion.div>
                  ))}
                  <div className="flex items-center gap-2 text-teal-500/50 mt-4">
                    <span className="w-1.5 h-4 bg-teal-500 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Right Column: Visualization Map */}
              <div className="p-8 relative overflow-hidden flex flex-col">
                <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-6">Semantic Graph</h4>
                
                <div className="flex-1 relative min-h-[200px]">
                  {/* Neural Graph Mockup */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                    <motion.path 
                      d="M 50 50 Q 100 80 150 60" 
                      fill="none" 
                      stroke="var(--obs-amber)" 
                      strokeWidth="1" 
                      strokeDasharray="4 4"
                      animate={{ strokeDashoffset: [20, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <motion.path 
                      d="M 150 60 Q 120 120 80 140" 
                      fill="none" 
                      stroke="var(--obs-teal)" 
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      animate={{ strokeDashoffset: [20, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                    <motion.path 
                      d="M 50 50 Q 60 100 80 140" 
                      fill="none" 
                      stroke="#818cf8" 
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      animate={{ strokeDashoffset: [20, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />

                    {/* Nodes */}
                    <motion.circle cx="50" cy="50" r="4" fill="var(--obs-amber)" className="animate-pulse" />
                    <motion.circle cx="150" cy="60" r="6" fill="var(--obs-teal)" className="animate-pulse" />
                    <motion.circle cx="80" cy="140" r="5" fill="#818cf8" className="animate-pulse" />
                    
                    {/* Node Labels */}
                    <text x="30" y="40" fontSize="8" fill="#94a3b8" className="font-mono">Audio</text>
                    <text x="140" y="45" fontSize="8" fill="#94a3b8" className="font-mono">Concept</text>
                    <text x="60" y="155" fontSize="8" fill="#94a3b8" className="font-mono">Summary</text>
                  </svg>
                </div>
              </div>

            </div>
          </div>
          
          {/* Ambient glow behind container */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-amber-500/10 blur-[100px] pointer-events-none -z-10 rounded-full mix-blend-screen" />
        </div>
      </div>
    </section>
  );
}
