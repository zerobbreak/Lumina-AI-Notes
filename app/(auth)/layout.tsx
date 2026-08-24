import Link from "next/link";
import type { ReactNode } from "react";
import { PaperSurface } from "@/components/paper/PaperSurface";

/* What a new account actually gets — kept honest against the product. */
const included = [
  "Lecture audio, PDFs and pasted text turned into structured notes",
  "Flashcards and quizzes generated from your own material",
  "Search across every note, file and deck you've made",
  "Free while the paid plans are paused",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <PaperSurface className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* ---- Left: the inked panel ------------------------------------- */}
      <aside
        className="grain relative hidden overflow-hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        <div className="relative px-12 pt-12">
          <Link href="/" className="display text-[1.7rem]" style={{ fontWeight: 700 }}>
            Lumina
          </Link>
        </div>

        <div className="relative px-12">
          <p className="mono mb-8" style={{ color: "var(--gold)" }}>
            Sit through the lecture
          </p>

          <p className="display" style={{ fontSize: "clamp(2rem, 3.2vw, 2.9rem)" }}>
            Leave with the{" "}
            <span style={{ fontStyle: "italic", fontWeight: 500, color: "var(--vermilion)" }}>
              understanding
            </span>
            .
          </p>

          <ul className="mt-10 space-y-px" style={{ background: "rgba(242,237,227,0.14)" }}>
            {included.map((item) => (
              <li
                key={item}
                className="flex gap-4 py-3.5 text-[0.9rem] leading-relaxed"
                style={{ background: "var(--ink)", color: "rgba(242,237,227,0.72)" }}
              >
                <span aria-hidden style={{ color: "var(--vermilion)" }}>
                  —
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="mono relative flex items-center justify-between px-12 pb-10 pt-12"
          style={{ color: "rgba(242,237,227,0.4)" }}
        >
          <span>Vol. 0.1</span>
          <span>Next.js · Convex · Gemini</span>
        </div>
      </aside>

      {/* ---- Right: the form ------------------------------------------- */}
      <main className="relative flex flex-1 flex-col">
        {/* compact masthead, small screens only */}
        <div
          className="flex items-center justify-between border-b px-6 py-5 lg:hidden"
          style={{ borderColor: "var(--rule)" }}
        >
          <Link href="/" className="display text-[1.4rem]" style={{ fontWeight: 700 }}>
            Lumina
          </Link>
          <span className="mono" style={{ color: "var(--ink-faint)" }}>
            Notes AI
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="enter w-full max-w-[26rem]">{children}</div>
        </div>

        <p
          className="mono px-6 pb-8 text-center sm:px-10"
          style={{ color: "var(--ink-faint)" }}
        >
          <Link href="/" className="rule-link">
            ← Back to the front page
          </Link>
        </p>
      </main>
    </PaperSurface>
  );
}
