"use client";

import Link from "next/link";
import { Twitter, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(20px)' }}>
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                <span style={{ color: 'var(--obs-amber)' }}>Note</span>AI
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}>
              Empowering students to learn faster and smarter with cutting-edge
              AI technology.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <Link
                href="#"
                className="transition-colors hover:text-white"
                style={{ color: 'var(--obs-muted)' }}
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="transition-colors hover:text-white"
                style={{ color: 'var(--obs-muted)' }}
              >
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>Product</h3>
            {["Features", "Pricing", "Universities", "Changelog"].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Resources Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>Resources</h3>
            {["Community", "Help Center", "Student Discount", "Blog"].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Company Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>Company</h3>
            {["About Us", "Careers", "Privacy Policy", "Terms"].map((item) => (
              <Link
                key={item}
                href="#"
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'var(--obs-text-dim)', fontFamily: 'var(--font-body)' }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-xs" style={{ color: 'var(--obs-muted)', fontFamily: 'var(--font-body)' }}>
            &copy; {new Date().getFullYear()} NoteAI Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs" style={{ color: 'var(--obs-muted)', fontFamily: 'var(--font-body)' }}>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
