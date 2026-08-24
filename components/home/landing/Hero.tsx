import Link from "next/link";
import { LoginButton } from "@/components/auth/LoginButton";

/* The raw lecture, as it actually arrives — and what Lumina writes in
   the margin beside it. Each row carries its own annotation so the two
   columns stay locked together at any width. */
const lines: { text: string; note?: { label: string; body: string } }[] = [
  {
    text: "…so the second law gives dS ≥ 0 for",
    note: { label: "Definition", body: "Second law" },
  },
  { text: "an isolated system. That's the exam" },
  {
    text: "one. Reversible is the idealisation:",
    note: { label: "Flag", body: "Exam question" },
  },
  { text: "nothing real is reversible. Carnot" },
  {
    text: "efficiency falls out as 1 − Tc/Th.",
    note: { label: "Formula", body: "η = 1 − Tc/Th" },
  },
];

const summary = [
  { label: "In", value: "Audio · PDF · Text" },
  { label: "Structured", value: "Cornell · Outline · Map" },
  { label: "Out", value: "Cards · Quizzes · Search" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1240px] px-6 pb-24 pt-14 md:px-10 md:pb-32 md:pt-20">
        {/* The dateline of a printed page. */}
        <div className="running-head mono enter mb-14 md:mb-20">
          <span>Lumina — Notes AI</span>
          <span className="hidden sm:inline">Vol. 0.1</span>
          <span className="ml-auto hidden md:inline" style={{ color: "var(--vermilion)" }}>
            Built for coursework
          </span>
        </div>

        <div className="grid items-start gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* ---- Statement ------------------------------------------- */}
          <div>
            <h1
              className="display enter"
              style={{ fontSize: "clamp(3rem, 7.2vw, 5.8rem)", ["--d" as string]: "0.05s" }}
            >
              Sit through
              <br />
              the lecture.
              <br />
              <span style={{ fontStyle: "italic", fontWeight: 500 }}>
                Leave with the{" "}
                <span className="marked" style={{ color: "var(--vermilion)" }}>
                  understanding
                </span>
                .
              </span>
            </h1>

            <p
              className="enter mt-9 text-[1.075rem] leading-[1.65] md:text-[1.15rem]"
              style={{ color: "var(--ink-soft)", maxWidth: "34rem", ["--d" as string]: "0.16s" }}
            >
              Lumina takes the recording, the slide deck, the PDF you never
              opened — and gives back structured notes, flashcards and quizzes
              that are actually tied to your courses and modules.
            </p>

            <div
              className="enter mt-11 flex flex-wrap items-center gap-x-8 gap-y-5"
              style={{ ["--d" as string]: "0.24s" }}
            >
              <LoginButton
                mode="signup"
                variant="ghost"
                className="h-[54px] rounded-none border px-8 text-[0.95rem] font-medium transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  borderColor: "var(--ink)",
                  boxShadow: "5px 5px 0 var(--vermilion)",
                  fontFamily: "var(--font-plex)",
                }}
              >
                Open a notebook
              </LoginButton>

              <Link href="#method" className="rule-link text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>
                See how it works ↓
              </Link>
            </div>

            <dl
              className="enter mt-16 grid max-w-lg grid-cols-1 gap-px sm:grid-cols-3"
              style={{ background: "var(--rule)", ["--d" as string]: "0.32s" }}
            >
              {summary.map((s) => (
                <div key={s.label} style={{ background: "var(--paper)" }} className="py-4 pr-4 sm:py-4">
                  <dt className="mono" style={{ color: "var(--vermilion)" }}>
                    {s.label}
                  </dt>
                  <dd className="mt-1.5 text-[0.83rem] leading-snug" style={{ color: "var(--ink-soft)" }}>
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ---- The specimen ---------------------------------------- */}
          <figure
            className="enter-figure mt-2 lg:mt-6"
            style={{ transform: "rotate(-1.3deg)", ["--d" as string]: "0.18s" }}
          >
            <div className="relative">
              {/* the filed, structured note sitting underneath */}
              <div
                aria-hidden
                className="absolute -bottom-5 left-12 right-2 h-28 border"
                style={{
                  background: "var(--paper-warm)",
                  borderColor: "var(--ink)",
                  transform: "rotate(1.7deg)",
                  boxShadow: "5px 5px 0 rgba(25,21,18,0.16)",
                }}
              />

              <div className="card relative">
                <header
                  className="flex items-center justify-between gap-4 border-b px-5 py-3"
                  style={{ borderColor: "var(--ink)", background: "var(--paper-warm)" }}
                >
                  <span className="mono">Phys 214 — Lecture 09</span>
                  <span className="mono flex items-center gap-2" style={{ color: "var(--vermilion)" }}>
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--vermilion)" }} />
                    47:12
                  </span>
                </header>

                <div className="ruled px-5 py-6">
                  <p className="mono mb-4" style={{ color: "var(--ink-faint)" }}>
                    Transcript
                  </p>

                  {/* Rows sit flush against each other so the annotation
                      column's left border reads as one unbroken margin rule. */}
                  <div>
                    {lines.map((line) => (
                      <div key={line.text} className="grid sm:grid-cols-[1fr_7.25rem] sm:gap-x-5">
                        <p className="py-[5px] text-[0.86rem] leading-[22px]" style={{ color: "var(--ink-soft)" }}>
                          {line.text}
                        </p>

                        <div
                          className="hidden py-[5px] pl-4 sm:block"
                          style={{ borderLeft: "1px solid rgba(196,61,27,0.45)" }}
                        >
                          {line.note ? (
                            <p style={{ color: "var(--vermilion)" }}>
                              <span className="mono block" style={{ fontSize: "0.5rem", letterSpacing: "0.14em" }}>
                                {line.note.label}
                              </span>
                              <span className="block text-[0.7rem] leading-[1.25]">{line.note.body}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <footer
                  className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t px-5 py-3.5"
                  style={{ borderColor: "var(--ink)", background: "var(--paper-warm)" }}
                >
                  {["1 structured note", "14 flashcards", "6 quiz questions"].map((out) => (
                    <span key={out} className="mono" style={{ color: "var(--ink-soft)" }}>
                      {out}
                    </span>
                  ))}
                </footer>
              </div>
            </div>

            <figcaption className="mono mt-14 pl-1" style={{ color: "var(--ink-faint)" }}>
              Fig. 1 — one recording, marked up and filed
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
