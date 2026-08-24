"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { LoginButton } from "@/components/auth/LoginButton";

const sections = [
  { href: "#method", label: "Method" },
  { href: "#apparatus", label: "Apparatus" },
  { href: "#recall", label: "Recall" },
  { href: "#roadmap", label: "Roadmap" },
];

export function Masthead() {
  const router = useRouter();
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        background: lifted ? "rgba(242, 237, 227, 0.92)" : "transparent",
        backdropFilter: lifted ? "blur(8px)" : "none",
        borderBottom: `1px solid ${lifted ? "var(--rule)" : "transparent"}`,
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-8 px-6 md:px-10">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span
            className="display text-[1.6rem] leading-none"
            style={{ fontWeight: 700 }}
          >
            Lumina
          </span>
          <span className="mono hidden sm:block" style={{ color: "var(--ink-faint)" }}>
            Notes&nbsp;AI
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="mono rule-link"
              style={{ color: "var(--ink-soft)" }}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <SignedOut>
            <LoginButton
              variant="ghost"
              className="mono hidden h-9 px-0 hover:bg-transparent sm:inline-flex"
              style={{ color: "var(--ink-soft)" }}
            >
              Sign in
            </LoginButton>
            <LoginButton
              mode="signup"
              variant="ghost"
              className="mono h-9 rounded-none border px-4 transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px]"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderColor: "var(--ink)",
                boxShadow: "3px 3px 0 var(--vermilion)",
              }}
            >
              Start free
            </LoginButton>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              prefetch
              onMouseEnter={() => router.prefetch("/dashboard")}
              className="mono flex h-9 items-center border px-4"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                borderColor: "var(--ink)",
                boxShadow: "3px 3px 0 var(--vermilion)",
              }}
            >
              Dashboard
            </Link>
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
