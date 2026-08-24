const passes = [
  {
    n: "01",
    title: "Capture",
    body: "Drop in lecture audio, a PDF, or pasted text. Files go through UploadThing, PDFs through the ingestion pipeline, and everything lands against the right course and module from your onboarding.",
    detail: ["Audio recordings", "PDF documents", "Pasted text"],
  },
  {
    n: "02",
    title: "Structure",
    body: "Gemini rewrites the raw material into a note you'd actually revise from — Cornell, outline, or mind-map oriented — inside a Tiptap editor that speaks maths, diagrams, tasks and charts.",
    detail: ["Cornell / outline / map", "KaTeX + diagrams", "Editable, not locked"],
  },
  {
    n: "03",
    title: "Recall",
    body: "The same note becomes flashcards and quizzes, gets embedded for semantic retrieval, and feeds streaks and daily goals so revision has a shape instead of a panic.",
    detail: ["Decks & quizzes", "Vector search", "Streaks & goals"],
  },
];

export function Method() {
  return (
    <section id="method" className="scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
        <div className="running-head mono mb-16">
          <span>§ 01</span>
          <span>The method</span>
        </div>

        <h2
          className="display mb-20 max-w-3xl"
          style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}
        >
          Three passes over the same material —{" "}
          <span style={{ fontStyle: "italic", fontWeight: 500 }}>
            each one leaves less work for the next.
          </span>
        </h2>

        <ol className="grid gap-px md:grid-cols-3" style={{ background: "var(--rule)" }}>
          {passes.map((p) => (
            <li
              key={p.n}
              className="reveal relative px-0 pb-10 pt-8 md:px-8 md:pt-10"
              style={{ background: "var(--paper)" }}
            >
              <span
                className="display block leading-none"
                style={{ fontSize: "3.4rem", color: "var(--vermilion)", fontWeight: 400 }}
              >
                {p.n}
              </span>

              <h3 className="display mt-4 text-[1.65rem]">{p.title}</h3>

              <p className="mt-4 text-[0.95rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {p.body}
              </p>

              <ul className="mt-7 space-y-2 border-t pt-5" style={{ borderColor: "var(--rule)" }}>
                {p.detail.map((d) => (
                  <li key={d} className="mono flex items-center gap-3" style={{ color: "var(--ink-faint)" }}>
                    <span style={{ color: "var(--vermilion)" }}>—</span>
                    {d}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
