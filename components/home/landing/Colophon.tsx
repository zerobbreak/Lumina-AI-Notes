import Link from "next/link";
import { Github, Twitter } from "lucide-react";

const columns = [
  {
    heading: "On this page",
    links: [
      { label: "Method", href: "#method" },
      { label: "Apparatus", href: "#apparatus" },
      { label: "Recall", href: "#recall" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Create account", href: "/sign-up" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
];

export function Colophon() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
      <div className="mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr] md:gap-16">
          <div>
            <Link href="/" className="display text-[1.8rem]" style={{ fontWeight: 700 }}>
              Lumina
            </Link>
            <p
              className="mt-4 text-[0.92rem] leading-relaxed"
              style={{ color: "var(--ink-soft)", maxWidth: "26rem" }}
            >
              A study workspace for coursework you actually have to sit exams
              on. Version 0.1 — web, with an optional desktop shell.
            </p>

            <div className="mt-7 flex items-center gap-5">
              <Link href="#" aria-label="Twitter" style={{ color: "var(--ink-faint)" }} className="transition-colors hover:text-[var(--ink)]">
                <Twitter className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </Link>
              <Link href="#" aria-label="GitHub" style={{ color: "var(--ink-faint)" }} className="transition-colors hover:text-[var(--ink)]">
                <Github className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </Link>
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.heading}>
              <h2 className="mono mb-5" style={{ color: "var(--vermilion)" }}>
                {col.heading}
              </h2>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="rule-link text-[0.92rem]"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* The colophon proper. */}
        <div
          className="mono mt-16 flex flex-col gap-3 border-t pt-6 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: "var(--rule)", color: "var(--ink-faint)" }}
        >
          <span>© {new Date().getFullYear()} Lumina Notes AI</span>
          <span>Set in Fraunces &amp; IBM Plex</span>
          <span>Next.js · Convex · Gemini</span>
        </div>
      </div>
    </footer>
  );
}
