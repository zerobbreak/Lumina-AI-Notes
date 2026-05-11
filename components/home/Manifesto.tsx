"use client";

import { motion } from "framer-motion";

export function Manifesto() {
  return (
    <section className="relative py-40 md:py-56 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-4 mb-16"
          >
            <div className="w-12 h-px bg-gradient-to-l from-amber-500/50 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500/80 font-bold font-mono">
              The Philosophy
            </span>
            <div className="w-12 h-px bg-gradient-to-r from-amber-500/50 to-transparent" />
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold text-white leading-[1.1] tracking-[-0.04em] mb-12"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Digital overload is the{" "}
            <span className="relative inline-block">
              <span className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-teal-500/20 blur-xl mix-blend-screen" />
              <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500 italic font-light px-2">enemy</span>
            </span>{" "}
            of genius.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-xl md:text-3xl leading-relaxed font-light mx-auto max-w-3xl"
            style={{ color: '#94a3b8', fontFamily: 'var(--font-body)' }}
          >
            We didn&apos;t build Lumina to help you store more data. We built it to help you{" "}
            <span className="text-white font-medium border-b border-white/20 pb-1">process less</span>
            —so you can think deeper.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2, delay: 1 }}
            className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-12 text-sm uppercase tracking-widest text-gray-500 font-semibold"
          >
            <span>Sanctuary for thought</span>
            <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/10" />
            <span>Anti-chaotic</span>
            <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/10" />
            <span>Private intelligence</span>
          </motion.div>
        </div>
      </div>
      
      {/* Immersive ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none -z-10">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/5 to-teal-500/5 blur-[120px] animate-pulse-slow" />
      </div>
    </section>
  );
}
