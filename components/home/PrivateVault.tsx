"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Fingerprint, EyeOff, Key, DatabaseBackup } from "lucide-react";

const securityBadges = [
  { icon: Lock, label: "Zero-Knowledge Encryption", desc: "We cannot read your notes." },
  { icon: DatabaseBackup, label: "Local-First Architecture", desc: "Your data lives on your device." },
  { icon: EyeOff, label: "No Model Training", desc: "Your thoughts are never used for AI." },
  { icon: Key, label: "User-Owned Keys", desc: "Cryptographic sovereignty." },
];

export function PrivateVault() {
  return (
    <section className="relative py-32 overflow-hidden" style={{ background: 'transparent' }}>
      {/* Immersive vault background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.03)_0%,transparent_70%)]" />
        {/* subtle vault lines */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-teal-500/10 to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            
            {/* Left: Secure Vault Visualization */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 w-full relative"
            >
              {/* Core shield glow */}
              <div className="absolute inset-0 blur-[80px] bg-teal-500/10 rounded-full animate-pulse-slow mix-blend-screen" />
              
              <div className="relative aspect-square max-w-md mx-auto rounded-full border border-teal-500/20 bg-black/40 backdrop-blur-3xl flex items-center justify-center p-8 shadow-[inset_0_0_60px_rgba(45,212,191,0.05)] overflow-hidden">
                
                {/* Rotating rings */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 rounded-full border border-teal-500/10 border-t-teal-500/40"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-8 rounded-full border border-white/5 border-b-white/20"
                />
                
                {/* Center Core */}
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-teal-500/20 to-transparent flex items-center justify-center border border-teal-500/30 shadow-[0_0_30px_rgba(45,212,191,0.2)] backdrop-blur-md">
                  <ShieldCheck className="w-12 h-12 text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border border-teal-400"
                  />
                </div>

              </div>
            </motion.div>

            {/* Right: Copy & Badges */}
            <div className="flex-1 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border"
                  style={{ 
                    background: 'rgba(45,212,191,0.05)', 
                    borderColor: 'rgba(45,212,191,0.2)', 
                    color: 'var(--obs-teal)'
                  }}
                >
                  <Fingerprint className="h-3 w-3" />
                  Sovereign Architecture
                </div>
                
                <h2 
                  className="text-4xl md:text-5xl font-extrabold text-white tracking-[-0.04em] mb-6 leading-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Your Mind. <br />
                  <span className="text-gray-500 font-light italic">Cryptographically Sealed.</span>
                </h2>
                
                <p className="text-xl leading-relaxed mb-12 text-gray-400 font-light" style={{ fontFamily: 'var(--font-body)' }}>
                  A second brain is only useful if you trust it completely. Lumina is designed as a private sanctuary. 
                  No ads. No data mining. Just you and your thoughts.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {securityBadges.map((badge, idx) => (
                  <motion.div
                    key={badge.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.6 }}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                      <badge.icon className="h-4 w-4 text-teal-400" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{badge.label}</h4>
                    <p className="text-xs text-gray-500">{badge.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
