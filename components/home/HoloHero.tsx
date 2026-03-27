"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";

const noteLines = [
  { label: "Cue", content: "What is quantum superposition?", color: "var(--obs-amber)" },
  { label: "Notes", content: "A quantum system exists in multiple states simultaneously until observed. The wave function ψ encodes...", color: "var(--obs-teal)" },
  { label: "Summary", content: "Superposition = multiple simultaneous states, collapsed by measurement.", color: "var(--obs-text-dim)" },
];

export function HoloHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, 80]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-24 pb-16"
    >
      {/* Constellation dots background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: 40 }).map((_, i) => (
            <circle
              key={i}
              cx={`${(i * 37 + 13) % 100}%`}
              cy={`${(i * 53 + 7) % 100}%`}
              r={i % 3 === 0 ? "2" : "1"}
              fill="var(--obs-amber, #d4a853)"
            />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={`l-${i}`}
              x1={`${(i * 37 + 13) % 100}%`}
              y1={`${(i * 53 + 7) % 100}%`}
              x2={`${((i + 1) * 37 + 13) % 100}%`}
              y2={`${((i + 1) * 53 + 7) % 100}%`}
              stroke="var(--obs-amber, #d4a853)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
        </svg>
        {/* Radial gradient */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(212,168,83,0.06) 0%, transparent 70%)' }} />
      </div>

      <motion.div 
        style={{ opacity, y }}
        className="relative z-10 container mx-auto px-6"
      >
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Left: Editorial Headline */}
          <div className="flex-1 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium tracking-wide"
              style={{ 
                background: 'rgba(212,168,83,0.1)', 
                border: '1px solid rgba(212,168,83,0.2)',
                color: 'var(--obs-amber)',
                fontFamily: 'var(--font-body)'
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--obs-amber)' }}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: 'var(--obs-amber)' }}></span>
              </span>
              Powered by Gemini 2.5 Flash
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="leading-[0.92] tracking-[-0.04em] mb-8"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 800 }}
            >
              <span className="block text-white">Your Second</span>
              <span className="block text-white">Brain,{" "}</span>
              <span className="observatory-text text-glow-amber">Engineered.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg md:text-xl max-w-lg mb-10 leading-relaxed"
              style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
            >
              AI-powered notes from lectures, PDFs, and audio — structured, searchable, collaborative.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-8 rounded-full font-bold group transition-all duration-300 text-black" style={{ background: 'var(--obs-amber)', fontFamily: 'var(--font-display)' }}>
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-14 px-8 rounded-full gap-2 relative overflow-hidden group" style={{ background: 'transparent', border: '1px solid rgba(212,168,83,0.3)', color: 'var(--obs-amber)', fontFamily: 'var(--font-display)' }}>
                <Sparkles className="h-4 w-4" />
                See it in action
                <span className="absolute inset-0 shimmer-border opacity-0 group-hover:opacity-30 transition-opacity rounded-full" />
              </Button>
            </motion.div>
          </div>

          {/* Right: Live Note Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full max-w-md lg:max-w-lg"
          >
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 rounded-3xl blur-[40px] opacity-20" style={{ background: 'linear-gradient(135deg, var(--obs-amber), var(--obs-teal))' }} />
              
              {/* Card */}
              <div className="relative obs-glass rounded-2xl overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--obs-amber)' }}>Cornell Note — Live</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--obs-text-dim)' }}>Generating</span>
                  </div>
                </div>

                {/* Note content */}
                <div className="p-6 space-y-4">
                  {noteLines.map((line, idx) => (
                    <motion.div
                      key={line.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.3, duration: 0.6 }}
                    >
                      <div className="flex items-start gap-3">
                        <span 
                          className="text-[9px] uppercase tracking-widest font-bold mt-1 shrink-0 px-2 py-0.5 rounded"
                          style={{ color: line.color, background: `${line.color}15` }}
                        >
                          {line.label}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--obs-text)' }}>
                          {line.content}
                          {idx === 1 && (
                            <span className="inline-block w-[2px] h-4 ml-0.5 align-middle" style={{ background: 'var(--obs-amber)', animation: 'type-cursor 1s step-end infinite' }} />
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bar at bottom */}
                <div className="px-6 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--obs-text-dim)' }}>Synthesis Progress</span>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--obs-amber)' }}>84%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '84%' }}
                      transition={{ delay: 1.5, duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, var(--obs-amber), var(--obs-teal))' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
      >
        <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-display)' }}>Scroll</span>
        <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, var(--obs-amber), transparent)' }} />
      </motion.div>
    </section>
  );
}
