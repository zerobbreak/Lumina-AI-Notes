"use client";

import { motion } from "framer-motion";
import { Network, Cpu, GraduationCap } from "lucide-react";

const roadmapItems = [
  {
    stage: "Researching",
    title: "Lumina Brain Sync",
    description: "Connect your entire knowledge base. Our neural engine identifies cross-subject connections you never knew existed.",
    icon: Network,
    status: "Active Research",
    accent: "var(--obs-amber)",
    progress: 35,
    offset: "lg:translate-y-0",
  },
  {
    stage: "Prototyping",
    title: "Dynamic Mind Maps",
    description: "See your notes, not just read them. Auto-generated 2D/3D graphs that visualize the structure of your learning.",
    icon: Cpu,
    status: "v0.8 Alpha",
    accent: "var(--obs-teal)",
    progress: 65,
    offset: "lg:translate-y-12",
  },
  {
    stage: "Development",
    title: "Adaptive Quiz Forge",
    description: "Testing that learns with you. AI-generated questions that target your weakest areas based on historical performance.",
    icon: GraduationCap,
    status: "In Development",
    accent: "#a78bfa",
    progress: 48,
    offset: "lg:translate-y-24",
  },
];

export function WIPRoadmap() {
  return (
    <section id="roadmap" className="relative py-28 overflow-hidden" style={{ background: 'var(--obs-bg)' }}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs uppercase tracking-[0.25em] font-semibold mb-4"
              style={{ color: 'var(--obs-amber)', fontFamily: 'var(--font-display)' }}
            >
              Mission Control
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.03em] mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              The <span className="observatory-text">Living</span> Roadmap
            </motion.h2>
            <p className="text-lg" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
              We&apos;re building the future of academic augmentation. Here&apos;s what&apos;s currently in the forge.
            </p>
          </div>
          <div className="hidden md:block">
            <div 
              className="px-4 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold animate-pulse"
              style={{ 
                background: 'rgba(212,168,83,0.08)', 
                border: '1px solid rgba(212,168,83,0.2)', 
                color: 'var(--obs-amber)',
                fontFamily: 'var(--font-display)'
              }}
            >
              Live Updates
            </div>
          </div>
        </div>

        {/* Staggered diagonal cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {roadmapItems.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`${item.offset} group`}
            >
              <div 
                className="relative rounded-2xl p-8 transition-all duration-500 h-full"
                style={{ 
                  background: 'var(--obs-surface)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Hover glow */}
                <div 
                  className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-[0.06] transition-opacity duration-700 blur-2xl pointer-events-none"
                  style={{ background: item.accent }}
                />

                <div className="relative z-10">
                  {/* Stage + Status row */}
                  <div className="flex items-center justify-between mb-6">
                    <span 
                      className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-md"
                      style={{ background: `${item.accent}12`, color: item.accent, border: `1px solid ${item.accent}20` }}
                    >
                      {item.stage}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--obs-muted)' }}>
                      {item.status}
                    </span>
                  </div>

                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110"
                    style={{ background: `${item.accent}10`, border: `1px solid ${item.accent}20` }}
                  >
                    <item.icon className="h-6 w-6" style={{ color: item.accent }} />
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
                    {item.description}
                  </p>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--obs-muted)' }}>Progress</span>
                      <span className="text-[10px] font-bold font-mono" style={{ color: item.accent }}>{item.progress}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + idx * 0.2, duration: 1.2, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${item.accent}, ${item.accent}80)` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Hover border */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: `1px solid ${item.accent}25` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
