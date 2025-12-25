"use client";

import Link from "next/link";
import { Sparkles, Twitter, Github, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl relative z-20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Lumina AI
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Turning chaotic lectures into structured knowledge. Built for
              students who want to learn, not just transcribe.
            </p>
          </div>

          {/* Product Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white">Product</h3>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Templates
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Enterprise
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
              Blog
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
              Contact
            </Link>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white">Legal</h3>
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
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-white transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Lumina AI Inc. All rights
            reserved.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="#"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <Github className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <Linkedin className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
