"use client";

import { useState } from "react";

const cards = [
  {
    front: "State the second law of thermodynamics.",
    back: "The entropy of an isolated system never decreases: dS ≥ 0. Equality holds only for a reversible process.",
  },
  {
    front: "Carnot efficiency, in terms of reservoir temperatures?",
    back: "η = 1 − T_c / T_h, with both temperatures absolute. No real engine beats it.",
  },
  {
    front: "Why is no real process reversible?",
    back: "Every real process generates entropy — friction, finite temperature differences, unrestrained expansion.",
  },
];

/* Quiz runs are stored, so the weak weeks are visible rather than felt. */
const attempts = [
  { week: "Week 09 — Entropy", score: 9, of: 10 },
  { week: "Week 07 — Heat engines", score: 6, of: 10 },
  { week: "Week 05 — Ideal gases", score: 8, of: 10 },
];

export function Recall() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[index];

  const next = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  };

  return (
    <section id="recall" className="scroll-mt-24 border-y" style={{ borderColor: "var(--rule)", background: "var(--paper-warm)" }}>
      <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
        <div className="running-head mono mb-16">
          <span>§ 03</span>
          <span>Recall</span>
        </div>

        <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <h2 className="display" style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}>
              Revision is a{" "}
              <span style={{ fontStyle: "italic", fontWeight: 500 }}>test</span>,
              not a re-read.
            </h2>

            <p className="mt-7 text-[1rem] leading-relaxed" style={{ color: "var(--ink-soft)", maxWidth: "34rem" }}>
              Generate a deck or a quiz straight from a note — the questions come
              from your own material, not a generic question bank. Results are
              stored, so you can see which weeks actually stuck and which ones
              you have been quietly avoiding.
            </p>

            <dl className="mt-12 space-y-px" style={{ background: "var(--rule)" }}>
              {[
                ["Decks", "Generated per note or per course, editable afterwards."],
                ["Quizzes", "Multiple questions per run, results kept for review."],
                ["Streaks & goals", "Daily targets, study streaks and badges on your profile."],
              ].map(([term, def]) => (
                <div key={term} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8" style={{ background: "var(--paper-warm)" }}>
                  <dt className="mono shrink-0 sm:w-40" style={{ color: "var(--vermilion)" }}>
                    {term}
                  </dt>
                  <dd className="text-[0.92rem]" style={{ color: "var(--ink-soft)" }}>
                    {def}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ---- an actual card you can turn over ---------------------- */}
          <div className="reveal lg:pt-4">
            <div className="mono mb-4 flex items-center justify-between" style={{ color: "var(--ink-faint)" }}>
              <span>Deck — Thermodynamics</span>
              <span>
                {String(index + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-pressed={flipped}
              aria-label={flipped ? "Show question" : "Show answer"}
              className="card block w-full cursor-pointer text-left"
              style={{ minHeight: "15rem", background: "var(--paper)" }}
            >
              <div className="flex h-full min-h-[15rem] flex-col p-7">
                <span className="mono" style={{ color: flipped ? "var(--vermilion)" : "var(--ink-faint)" }}>
                  {flipped ? "Answer" : "Question"}
                </span>

                <p
                  key={`${index}-${flipped}`}
                  className={`enter ${flipped ? "mt-6 text-[1rem] leading-relaxed" : "display mt-6 text-[1.5rem]"}`}
                  style={{ color: flipped ? "var(--ink-soft)" : "var(--ink)" }}
                >
                  {flipped ? card.back : card.front}
                </p>

                <span className="mono mt-auto pt-6" style={{ color: "var(--ink-faint)" }}>
                  {flipped ? "Click to turn back" : "Click to turn over"}
                </span>
              </div>
            </button>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={next}
                className="mono rule-link"
                style={{ color: "var(--ink)" }}
              >
                Next card →
              </button>

              <div className="flex gap-1.5" aria-hidden>
                {cards.map((c, i) => (
                  <span
                    key={c.front}
                    className="h-1.5 w-6"
                    style={{ background: i === index ? "var(--vermilion)" : "var(--rule)" }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-12 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
              <p className="mono mb-5" style={{ color: "var(--ink-faint)" }}>
                Stored quiz results
              </p>

              <ul className="space-y-4">
                {attempts.map((a) => (
                  <li key={a.week} className="flex items-center gap-5">
                    <span className="w-44 shrink-0 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
                      {a.week}
                    </span>

                    <span
                      className="relative h-1.5 flex-1"
                      style={{ background: "var(--rule)" }}
                      aria-hidden
                    >
                      <span
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${(a.score / a.of) * 100}%`,
                          background: a.score / a.of < 0.7 ? "var(--gold)" : "var(--spruce)",
                        }}
                      />
                    </span>

                    <span className="mono w-12 shrink-0 text-right" style={{ color: "var(--ink)" }}>
                      {a.score}/{a.of}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
