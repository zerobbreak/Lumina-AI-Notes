"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Fingerprint, EyeOff, Key } from "lucide-react";

const securityBadges = [
  { icon: Lock, label: "End-to-End Encrypted" },
  { icon: Fingerprint, label: "Secure Access" },
  { icon: EyeOff, label: "Zero-Knowledge" },
  { icon: Key, label: "Private Keys" },
];

export function PrivateVault() {
  return (
    <section className="relative py-24 overflow-hidden" style={{ background: 'var(--obs-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left: Badge strip */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-row lg:flex-col gap-3 flex-wrap"
          >
            {securityBadges.map((badge, idx) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 group"
                style={{ 
                  background: 'var(--obs-surface)', 
                  border: '1px solid rgba(255,255,255,0.05)' 
                }}
              >
                <badge.icon className="h-4 w-4 shrink-0" style={{ color: 'var(--obs-teal)' }} />
                <span className="text-xs font-semibold text-white whitespace-nowrap" style={{ fontFamily: 'var(--font-display)' }}>
                  {badge.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Right: Statement */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex-1 max-w-2xl"
          >
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6"
              style={{ 
                background: 'rgba(45,212,191,0.08)', 
                border: '1px solid rgba(45,212,191,0.2)', 
                color: 'var(--obs-teal)',
                fontFamily: 'var(--font-display)'
              }}
            >
              <ShieldCheck className="h-3 w-3" />
              Sovereign Data Protection
            </div>
            <h2 
              className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] mb-6 leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Your Knowledge is{" "}
              <span className="observatory-text">Sovereign</span>.
            </h2>
            <p className="text-lg leading-relaxed mb-4" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
              Privacy by default. We never train models on your data. Your second brain is a private vault — accessible only by you and those you invite.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
