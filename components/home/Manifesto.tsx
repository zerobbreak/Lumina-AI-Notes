"use client";

import { motion } from "framer-motion";

export function Manifesto() {
  return (
    <section className="relative py-32 md:py-48 overflow-hidden" style={{ background: 'var(--obs-bg)' }}>
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl flex gap-8">
          {/* Editorial gutter line */}
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:block w-px shrink-0 origin-top"
            style={{ background: 'linear-gradient(to bottom, var(--obs-amber), transparent)' }}
          />

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="will-change-transform"
          >
            <h2 
              className="text-[clamp(2.2rem,6vw,5rem)] font-extrabold text-white leading-[1.05] tracking-[-0.03em] mb-10"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Digital overload is the{" "}
              <span className="observatory-text text-glow-amber">enemy</span>{" "}
              of genius.
            </h2>
            <div className="w-16 h-px mb-10" style={{ background: 'var(--obs-amber)' }} />
            <p 
              className="text-xl md:text-2xl leading-relaxed max-w-2xl"
              style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
            >
              We didn&apos;t build Lumina to help you store more data. We built it to help you{" "}
              <span className="text-white font-medium">process less</span>
              —so you can think deeper.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Decorative orbit ring */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[500px] h-[500px] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 500 500" className="w-full h-full opacity-[0.04]">
          <circle cx="250" cy="250" r="200" fill="none" stroke="var(--obs-amber)" strokeWidth="0.5" />
          <circle cx="250" cy="250" r="160" fill="none" stroke="var(--obs-teal)" strokeWidth="0.5" />
          <circle cx="250" cy="250" r="120" fill="none" stroke="var(--obs-amber)" strokeWidth="0.5" strokeDasharray="4 8" />
        </svg>
      </div>
    </section>
  );
}
