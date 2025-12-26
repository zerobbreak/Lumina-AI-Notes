"use client";

import Link from "next/link";
import { Twitter, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl relative z-20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold tracking-tight text-white">
                <span className="text-cyan-400">Note</span>AI
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Empowering students to learn faster and smarter with cutting-edge
              AI technology.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <Link
                href="#"
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-white transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white">Product</h3>
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Universities
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Changelog
            </Link>
          </div>

          {/* Resources Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white">Resources</h3>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Community
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Help Center
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Student Discount
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Blog
            </Link>
          </div>

          {/* Company Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white">Company</h3>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              About Us
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Careers
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} NoteAI Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
