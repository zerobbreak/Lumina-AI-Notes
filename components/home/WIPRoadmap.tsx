"use client";

import { motion } from "framer-motion";
import { Network, Cpu, GraduationCap, Mic2, Eye, Bot, Layers } from "lucide-react";

const roadmapItems = [
  {
    stage: "Researching",
    title: "Voice Memory Matrix",
    description: "Always-on ambient capture. Lumina listens to your meetings and autonomously builds contextual knowledge graphs without you ever pressing record.",
    icon: Mic2,
    status: "Active Research",
    accent: "var(--obs-amber)",
    progress: 35,
    offset: "lg:-translate-y-8",
  },
  {
    stage: "Prototyping",
    title: "Multimodal Synthesis",
    description: "Visual logic extraction. Upload diagrams, whiteboard photos, or complex charts, and Lumina will seamlessly translate them into your semantic network.",
    icon: Eye,
    status: "v0.8 Alpha",
    accent: "var(--obs-teal)",
    progress: 65,
    offset: "lg:translate-y-8",
  },
  {
    stage: "Development",
    title: "Autonomous Agents",
    description: "Your knowledge isn't static. Workspace agents actively search your notes, connect new findings to old thoughts, and propose new hypotheses while you sleep.",
    icon: Bot,
    status: "In Development",
    accent: "#818cf8",
    progress: 48,
    offset: "lg:translate-y-24",
  },
];

export function WIPRoadmap() {
  return (
    <section id="roadmap" className="relative py-32 overflow-hidden" style={{ background: 'transparent' }}>
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 mb-6"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-amber-500/80">
                Future Intelligence
              </p>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-extrabold text-white tracking-[-0.04em] mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              The Evolution of{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-teal-400">Thought.</span>
            </motion.h2>
            <p className="text-xl text-gray-400 font-light" style={{ fontFamily: 'var(--font-body)' }}>
              We are constantly expanding Lumina's cognitive horizons. This is what's currently in the neural forge.
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-md">
            <div className="flex gap-1.5 h-3">
              <motion.div animate={{ height: ["40%", "100%", "40%"] }} transition={{ duration: 1, repeat: Infinity }} className="w-1 bg-teal-400" />
              <motion.div animate={{ height: ["100%", "40%", "100%"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1 bg-amber-400" />
              <motion.div animate={{ height: ["40%", "80%", "40%"] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1 bg-indigo-400" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-300">Live Telemetry</span>
          </div>
        </div>

        {/* Central connecting glowing line */}
        <div className="absolute top-1/2 left-0 right-0 h-px hidden lg:block opacity-20 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, var(--obs-teal), var(--obs-amber), transparent)', transform: 'translateY(-50%)' }}>
          <motion.div 
            animate={{ left: ["-10%", "110%"] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-20px] w-10 h-[40px] bg-white/20 blur-[10px] mix-blend-screen"
          />
        </div>

        {/* Staggered futuristic cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {roadmapItems.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`${item.offset} group relative`}
            >
              {/* Backlight glow */}
              <div 
                className="absolute -inset-4 rounded-[2rem] opacity-0 group-hover:opacity-30 transition-opacity duration-1000 blur-3xl pointer-events-none mix-blend-screen"
                style={{ background: item.accent }}
              />

              <div 
                className="relative rounded-3xl p-8 transition-all duration-700 h-full bg-black/40 backdrop-blur-xl hover:bg-black/20"
                style={{ 
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02)'
                }}
              >
                {/* Decorative circuit line */}
                <div className="absolute top-0 right-10 w-px h-12 bg-gradient-to-b from-white/20 to-transparent" />
                <div className="absolute top-12 right-10 w-2 h-2 rounded-full border border-white/20 translate-x-[-3.5px]" />

                <div className="relative z-10">
                  {/* Status row */}
                  <div className="flex items-center justify-between mb-8">
                    <span 
                      className="text-[9px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-sm border"
                      style={{ background: `${item.accent}10`, color: item.accent, borderColor: `${item.accent}30` }}
                    >
                      {item.stage}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: '#64748b' }}>
                      {item.status}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 blur-lg opacity-40" style={{ background: item.accent }} />
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center relative bg-black/50 backdrop-blur-md border border-white/10 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6"
                    >
                      <item.icon className="h-6 w-6" style={{ color: item.accent }} />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-400 mb-8 font-light" style={{ fontFamily: 'var(--font-body)' }}>
                    {item.description}
                  </p>

                  {/* Futuristic Progress bar */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] uppercase tracking-[0.3em] text-gray-500 font-bold">Neural Link</span>
                      <span className="text-[10px] font-bold font-mono" style={{ color: item.accent }}>{item.progress}%</span>
                    </div>
                    <div className="h-[2px] w-full bg-white/10 relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + idx * 0.2, duration: 1.5, ease: "easeOut" }}
                        className="absolute top-0 left-0 bottom-0 shadow-[0_0_10px_currentColor]"
                        style={{ background: item.accent, color: item.accent }}
                      />
                    </div>
                  </div>
                </div>

                {/* Hover border glow */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ border: `1px solid ${item.accent}40` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
