const entries = [
  "Lecture audio",
  "PDF ingestion",
  "Cornell notes",
  "Outline mode",
  "Mind maps",
  "KaTeX formulas",
  "Diagrams",
  "Charts",
  "Flashcard decks",
  "Quiz generation",
  "Semantic search",
  "Share links",
  "Presence",
  "Study streaks",
  "Desktop app",
];

/** A printed index of what's in the box — set in mono, running on a band. */
export function IndexStrip() {
  return (
    <div
      className="relative overflow-hidden border-y py-4"
      style={{ background: "var(--spruce)", borderColor: "var(--ink)" }}
      aria-label="Feature index"
    >
      <div className="marquee">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {entries.map((entry) => (
              <li key={entry} className="mono flex items-center whitespace-nowrap px-6" style={{ color: "#e6ddcb" }}>
                {entry}
                <span className="ml-6" style={{ color: "var(--gold)" }}>
                  ◆
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
