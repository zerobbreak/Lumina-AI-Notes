const items = [
  {
    title: "Lumina Brain Sync",
    status: "In development",
    body: "Cross-note and cross-course linking, so the system surfaces the connection between week 3 and week 11 before you find it yourself.",
  },
  {
    title: "Dynamic mind maps",
    status: "In development",
    body: "The diagram tooling exists today; this extends it into graph views that are generated and kept current from note structure.",
  },
  {
    title: "Adaptive quiz forge",
    status: "In development",
    body: "Quizzes weighted toward your weak areas using stored performance history rather than an even spread.",
  },
  {
    title: "Live co-editing cursors",
    status: "Not started",
    body: "Presence — who is looking at a note — ships today. Cursor-level real-time collaboration does not.",
  },
  {
    title: "Paid plans",
    status: "Paused",
    body: "Paystack checkout is switched off. Every tier is free until the integration is back, and nothing asks you for a card.",
  },
];

const statusColor: Record<string, string> = {
  "In development": "var(--vermilion)",
  "Not started": "var(--ink-faint)",
  Paused: "var(--gold)",
};

export function Roadmap() {
  return (
    <section id="roadmap" className="scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
        <div className="running-head mono mb-16">
          <span>§ 04</span>
          <span>Not built yet</span>
        </div>

        <div className="mb-14 grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-end">
          <h2 className="display" style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}>
            The honest list.
          </h2>
          <p className="text-[1rem] leading-relaxed md:pb-2" style={{ color: "var(--ink-soft)" }}>
            Marketing pages usually bury this. Lumina is version 0.1 and the
            gap between what runs and what&apos;s planned belongs on the front
            page, not in a changelog.
          </p>
        </div>

        <ul className="border-t" style={{ borderColor: "var(--ink)" }}>
          {items.map((item, i) => (
            <li
              key={item.title}
              className="reveal grid gap-3 border-b py-7 md:grid-cols-[3rem_1fr_1.25fr_9rem] md:items-baseline md:gap-8"
              style={{ borderColor: "var(--rule)" }}
            >
              <span className="mono" style={{ color: "var(--ink-faint)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              <h3 className="display text-[1.35rem]">{item.title}</h3>

              <p className="text-[0.92rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                {item.body}
              </p>

              <span
                className="mono md:text-right"
                style={{ color: statusColor[item.status] ?? "var(--ink-faint)" }}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
