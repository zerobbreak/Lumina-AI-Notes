"use client";

import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles, BrainCircuit } from "lucide-react";
import { useEffect, useRef } from "react";

const noteLines = [
  { label: "Entity Detected", content: "Neural architecture mapping...", color: "var(--obs-amber)" },
  { label: "Synthesis", content: "Transforming unstructured data into semantic graphs.", color: "var(--obs-teal)" },
  { label: "Insight", content: "Pattern identified across 4 documents.", color: "#818cf8" },
];

export function HoloHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, 100]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 40;
      const y = (clientY / innerHeight - 0.5) * 40;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-32 pb-20"
    >
      {/* Dynamic particles / flow lines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--obs-teal)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--obs-amber)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {Array.from({ length: 15 }).map((_, i) => {
            // Pseudo-random values for deterministic hydration
            const rnd1 = Math.abs(Math.sin(i * 12.9898));
            const rnd2 = Math.abs(Math.sin(i * 78.233));
            const rnd3 = Math.abs(Math.cos(i * 45.123));
            const rnd4 = Math.abs(Math.sin(i * 93.234));
            
            return (
            <motion.path
              key={i}
              d={`M -100 ${100 + i * 50} Q ${300 + rnd1 * 200} ${200 + rnd2 * 200 - 100}, 1200 ${100 + i * 40}`}
              fill="none"
              stroke="url(#glow)"
              strokeWidth={rnd3 > 0.5 ? 0.5 : 1}
              strokeDasharray="100 200"
              initial={{ strokeDashoffset: 1000, opacity: 0 }}
              animate={{ 
                strokeDashoffset: [1000, 0], 
                opacity: [0, 0.4, 0] 
              }}
              transition={{
                duration: 10 + rnd4 * 10,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.5,
              }}
            />
          )})}
        </svg>
      </div>

      <motion.div 
        style={{ opacity, y }}
        className="relative z-10 container mx-auto px-6"
      >
        <div className="flex flex-col lg:flex-row items-center gap-20">
          
          <div className="flex-1 max-w-3xl relative z-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-[0.1em] uppercase backdrop-blur-md"
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--obs-teal)',
                boxShadow: '0 0 20px rgba(45,212,191,0.1)'
              }}
            >
              <Sparkles className="w-3 h-3 animate-pulse" />
              Intelligence Engine Active
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="leading-[0.9] tracking-[-0.05em] mb-10"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6.5rem)', fontWeight: 800 }}
            >
              <span className="block text-white">Thoughts,</span>
              <span className="block text-white">Evolving.</span>
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-indigo-400 to-amber-500 animate-gradient-x mix-blend-plus-lighter pb-2">
                Not Stored.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-lg md:text-2xl max-w-xl mb-12 leading-relaxed font-light"
              style={{ color: '#94a3b8', fontFamily: 'var(--font-body)' }}
            >
              Step into an ambient cognitive workspace. Lumina listens, structures, and connects your ideas while you think.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-5"
            >
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-10 rounded-full font-bold group transition-all duration-500 text-black hover:scale-105 hover:shadow-[0_0_40px_rgba(212,168,83,0.4)]" style={{ background: 'linear-gradient(135deg, #d4a853, #2dd4bf)', fontFamily: 'var(--font-display)' }}>
                  Enter Vault
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            style={{ x: springX, y: springY }}
            initial={{ opacity: 0, scale: 0.8, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full max-w-xl relative"
          >
            {/* Ambient intelligence core */}
            <div className="absolute inset-0 blur-[80px] bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-teal-500/20 animate-pulse-slow rounded-full mix-blend-screen pointer-events-none" />
            
            <div className="relative rounded-3xl overflow-hidden glass-dark border border-white/5 shadow-2xl backdrop-blur-2xl bg-black/40">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-4 h-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-[0.2em] font-medium text-amber-400/80">Lumina Core Processing</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  <span className="text-[10px] uppercase tracking-wider text-teal-400">Live</span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {noteLines.map((line, idx) => (
                  <motion.div
                    key={line.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + idx * 0.4, duration: 0.8 }}
                    className="relative"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-px h-full absolute left-[15px] top-6 bg-gradient-to-b from-white/10 to-transparent" />
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/5">
                        <div className="w-2 h-2 rounded-full" style={{ background: line.color, boxShadow: `0 0 10px ${line.color}` }} />
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] uppercase tracking-[0.15em] font-bold block mb-1" style={{ color: line.color }}>
                          {line.label}
                        </span>
                        <p className="text-sm leading-relaxed text-gray-300 font-light">
                          {line.content}
                          {idx === 2 && (
                            <motion.span 
                              animate={{ opacity: [1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.8 }}
                              className="inline-block w-1.5 h-4 ml-1 align-middle bg-amber-400" 
                            />
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Advanced Waveform Visualizer */}
              <div className="px-8 pb-8 pt-4">
                <div className="h-12 w-full flex items-end gap-1 overflow-hidden opacity-60">
                  {Array.from({ length: 40 }).map((_, i) => {
                    // Pseudo-random values for deterministic hydration
                    const rnd1 = Math.abs(Math.sin(i * 42.1898));
                    const rnd2 = Math.abs(Math.cos(i * 38.233));
                    const rnd3 = Math.abs(Math.sin(i * 15.123));
                    
                    return (
                    <motion.div
                      key={i}
                      className="w-full h-full bg-gradient-to-t from-teal-500/50 to-amber-500/50 rounded-t-sm"
                      style={{ transformOrigin: "bottom", willChange: "transform" }}
                      animate={{
                        scaleY: [0.2, 0.4 + rnd1 * 0.6, 0.2],
                      }}
                      transition={{
                        duration: 1 + rnd2 * 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: rnd3 * 2,
                      }}
                    />
                  )})}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 10, 0], opacity: [0.2, 0.6, 0.2] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Initialize</span>
        <div className="w-px h-16 bg-gradient-to-b from-teal-500/50 to-transparent" />
      </motion.div>
    </section>
  );
}
