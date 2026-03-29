"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/** Deterministic [0, 1) from index — same on server and client (no Math.random in render). */
function stable01(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: stable01(i, 1) * 100,
    y: stable01(i, 2) * 100,
    size: stable01(i, 3) * 2 + 0.5,
    delay: stable01(i, 4) * 4,
    duration: stable01(i, 5) * 3 + 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: star.id % 3 === 0 ? "#d4a853" : star.id % 3 === 1 ? "#2dd4bf" : "#e2e8f0",
          }}
          animate={{
            opacity: [0.1, 0.8, 0.1],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="dark flex min-h-screen w-full font-body"
      style={{ background: "var(--obs-bg, #050a14)", fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}
    >
      {/* Left panel -- atmospheric branding */}
      <div className="hidden lg:flex w-[52%] relative items-center justify-center overflow-hidden">
        {/* Layered gradient atmosphere */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(212,168,83,0.12) 0%, transparent 60%), " +
              "radial-gradient(ellipse 70% 50% at 70% 70%, rgba(45,212,191,0.10) 0%, transparent 55%), " +
              "linear-gradient(160deg, #050a14 0%, #0b1120 40%, #050a14 100%)",
          }}
        />

        {/* Animated floating orbs */}
        <motion.div
          className="absolute w-[340px] h-[340px] rounded-full blur-[100px] opacity-25"
          style={{ background: "var(--obs-amber, #d4a853)", top: "15%", left: "10%" }}
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[280px] h-[280px] rounded-full blur-[90px] opacity-20"
          style={{ background: "var(--obs-teal, #2dd4bf)", bottom: "10%", right: "5%" }}
          animate={{ x: [0, -30, 25, 0], y: [0, 25, -35, 0], scale: [1, 0.92, 1.1, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[160px] h-[160px] rounded-full blur-[70px] opacity-15"
          style={{ background: "#8b5cf6", top: "60%", left: "50%" }}
          animate={{ x: [0, 20, -15, 0], y: [0, -20, 15, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />

        <StarField />

        {/* Noise texture overlay */}
        <div className="noise-overlay absolute inset-0 opacity-[0.03]" />

        {/* Branding content */}
        <div className="relative z-10 px-12 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <Link href="/" className="inline-flex items-center gap-3 mb-10 group">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--obs-amber, #d4a853), var(--obs-teal, #2dd4bf))",
                  color: "#050a14",
                  fontFamily: "var(--font-display, 'Syne', sans-serif)",
                }}
              >
                L
              </div>
              <span
                className="text-lg font-semibold tracking-tight"
                style={{ color: "var(--obs-text, #e2e8f0)", fontFamily: "var(--font-display, 'Syne', sans-serif)" }}
              >
                Lumina AI
              </span>
            </Link>
          </motion.div>

          <motion.h1
            className="observatory-text text-glow-amber font-display"
            style={{
              fontSize: "clamp(2rem, 3.2vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-display, 'Syne', sans-serif)",
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            Master your
            <br />
            degree with AI
          </motion.h1>

          <motion.p
            className="mt-5 text-base leading-relaxed"
            style={{ color: "var(--obs-text-dim, #94a3b8)", maxWidth: "380px" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            Turn raw lecture audio into a high-fidelity knowledge base. Summaries,
            flashcards, and quizzes — generated in seconds.
          </motion.p>

          {/* Decorative separator */}
          <motion.div
            className="mt-10 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <div
              className="h-px flex-1 max-w-[80px]"
              style={{ background: "linear-gradient(90deg, var(--obs-amber, #d4a853), transparent)" }}
            />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i === 1 ? "var(--obs-teal, #2dd4bf)" : "var(--obs-amber, #d4a853)" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                />
              ))}
            </div>
            <div
              className="h-px flex-1 max-w-[80px]"
              style={{ background: "linear-gradient(90deg, transparent, var(--obs-teal, #2dd4bf))" }}
            />
          </motion.div>

          {/* Social proof line */}
          <motion.p
            className="mt-6 text-xs tracking-wide uppercase"
            style={{ color: "var(--obs-muted, #64748b)", letterSpacing: "0.1em" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.75 }}
          >
            Trusted by 2,000+ students worldwide
          </motion.p>
        </div>

        {/* Bottom edge gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to top, var(--obs-bg, #050a14), transparent)" }}
        />
      </div>

      {/* Right panel -- Clerk form */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: "var(--obs-bg, #050a14)" }}>
        {/* Subtle radial glow behind form */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(212,168,83,0.06) 0%, transparent 70%), " +
              "radial-gradient(ellipse 40% 50% at 60% 60%, rgba(45,212,191,0.04) 0%, transparent 60%)",
          }}
        />

        {/* Mobile-only compact branding */}
        <motion.div
          className="lg:hidden pt-8 pb-4 px-6 text-center relative z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, var(--obs-amber, #d4a853), var(--obs-teal, #2dd4bf))",
                color: "#050a14",
                fontFamily: "var(--font-display, 'Syne', sans-serif)",
              }}
            >
              L
            </div>
            <span
              className="text-base font-semibold tracking-tight"
              style={{ color: "var(--obs-text, #e2e8f0)", fontFamily: "var(--font-display, 'Syne', sans-serif)" }}
            >
              Lumina AI
            </span>
          </Link>
        </motion.div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
