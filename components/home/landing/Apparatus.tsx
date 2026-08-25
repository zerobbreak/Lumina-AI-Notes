import {
  PenLine,
  Search,
  Users,
  FileUp,
  MonitorDown,
  Sigma,
  Share2,
} from "lucide-react";
import type { ReactNode } from "react";

function Panel({
  span,
  children,
  inverted = false,
}: {
  span: string;
  children: ReactNode;
  inverted?: boolean;
}) {
  return (
    <div
      className={`card card-lift reveal flex flex-col p-6 md:p-7 ${span}`}
      style={
        inverted
          ? { background: "var(--spruce)", color: "#ece4d5", borderColor: "var(--ink)" }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function Head({ icon, label, muted }: { icon: ReactNode; label: string; muted?: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span style={{ color: muted ?? "var(--vermilion)" }}>{icon}</span>
      <span className="mono" style={{ color: muted ?? "var(--vermilion)" }}>
        {label}
      </span>
    </div>
  );
}

export function Apparatus() {
  return (
    <section id="apparatus" className="scroll-mt-24">
      <div className="mx-auto max-w-[1240px] px-6 py-24 md:px-10 md:py-32">
        <div className="running-head mono mb-16">
          <span>§ 02</span>
          <span>The apparatus</span>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-end">
          <h2 className="display" style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)" }}>
            A workspace, not a
            <br />
            chat box with notes bolted on.
          </h2>
          <p className="text-[1rem] leading-relaxed md:pb-2" style={{ color: "var(--ink-soft)" }}>
            Everything below exists in the product today. What isn&apos;t built
            yet is listed further down, plainly, under §&nbsp;04.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <Panel span="md:col-span-7">
            <Head icon={<PenLine size={15} strokeWidth={1.75} />} label="The editor" />
            <h3 className="display text-[1.55rem]">Writes the way a course does</h3>
            <p className="mt-3.5 text-[0.93rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Tiptap underneath, with maths set in KaTeX, mind-map style
              diagrams, task lists, images, code blocks and charts. Slash
              commands for the things you reach for most, and an AI bubble menu
              on any selection.
            </p>

            {/* a specimen of the editor's output */}
            <div
              className="mt-7 border p-4"
              style={{ borderColor: "var(--rule)", background: "var(--paper-warm)" }}
            >
              <div className="mono mb-3 flex items-center gap-2" style={{ color: "var(--ink-faint)" }}>
                <Sigma size={12} strokeWidth={2} />
                Block
              </div>
              <p className="display text-[1.15rem]" style={{ fontStyle: "italic" }}>
                ∮ E · dA = Q<sub>enc</sub> / ε₀
              </p>
              <ul className="mt-4 space-y-2 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
                {[
                  ["Derive from Coulomb's law", true],
                  ["Problem set 4, q. 2–5", false],
                ].map(([task, done]) => (
                  <li key={task as string} className="flex items-center gap-2.5">
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center border text-[9px]"
                      style={{
                        borderColor: "var(--ink-soft)",
                        background: done ? "var(--vermilion)" : "transparent",
                        color: "var(--paper)",
                      }}
                    >
                      {done ? "✓" : ""}
                    </span>
                    <span style={{ textDecoration: done ? "line-through" : undefined }}>
                      {task as string}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel span="md:col-span-5" inverted>
            <Head icon={<Search size={15} strokeWidth={1.75} />} label="Retrieval" muted="var(--gold)" />
            <h3 className="display text-[1.55rem]">Find the thing you half-remember</h3>
            <p className="mt-3.5 text-[0.93rem] leading-relaxed" style={{ color: "rgba(236,228,213,0.72)" }}>
              Global search runs across notes, files and decks with tag and type
              filters. Notes are embedded as vectors too, so the AI layer can
              pull in related material you never thought to link.
            </p>

            <div
              className="mt-7 border px-4 py-3"
              style={{ borderColor: "rgba(236,228,213,0.24)" }}
            >
              <p className="mono mb-3" style={{ color: "var(--gold)" }}>
                Query
              </p>
              <p className="text-[0.9rem]" style={{ fontStyle: "italic" }}>
                &ldquo;that entropy thing from before reading week&rdquo;
              </p>
              <div
                className="mt-4 space-y-2 border-t pt-3"
                style={{ borderColor: "rgba(236,228,213,0.18)" }}
              >
                {["Phys 214 — Lecture 09", "Deck: Thermodynamics", "PDF: Chapter 4 notes"].map((r) => (
                  <p key={r} className="mono flex items-center gap-2.5" style={{ color: "rgba(236,228,213,0.8)" }}>
                    <span style={{ color: "var(--gold)" }}>→</span>
                    {r}
                  </p>
                ))}
              </div>
            </div>
          </Panel>

          <Panel span="md:col-span-4">
            <Head icon={<FileUp size={15} strokeWidth={1.75} />} label="Intake" />
            <h3 className="display text-[1.4rem]">Files that become notes</h3>
            <p className="mt-3.5 text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Uploads run through UploadThing; PDFs are parsed and handed
              straight to generation, so a reading list turns into revisable
              notes without a copy-paste stage.
            </p>
          </Panel>

          <Panel span="md:col-span-4">
            <Head icon={<Users size={15} strokeWidth={1.75} />} label="Sharing" />
            <h3 className="display text-[1.4rem]">Public links and presence</h3>
            <p className="mt-3.5 text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Publish a note to a share link, add collaborators, and see who
              else is on a page right now. Full live co-editing cursors are
              roadmap, not today — see §&nbsp;04.
            </p>
          </Panel>

          <Panel span="md:col-span-4">
            <Head icon={<MonitorDown size={15} strokeWidth={1.75} />} label="Desktop" />
            <h3 className="display text-[1.4rem]">Runs in its own window</h3>
            <p className="mt-3.5 text-[0.9rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              An optional Electron shell packages the same workspace as a
              desktop app, with sign-in handed back through a custom protocol.
            </p>
          </Panel>

          <Panel span="md:col-span-12">
            <Head icon={<Share2 size={15} strokeWidth={1.75} />} label="Studio" />
            <h3 className="display text-[1.55rem]">
              A knowledge graph, not just a chat with citations
            </h3>
            <p className="mt-3.5 max-w-[46ch] text-[0.93rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Studio now has a Graph mode next to Chat: every note plotted by
              embedding similarity and by the [[wikilinks]] you write, sized by
              how connected it is, with unlinked notes flagged instead of
              quietly forgotten. Select a note to see what links to it and
              what&apos;s merely related, then hand that whole neighborhood
              straight to Studio&apos;s chat.
            </p>

            <div
              className="mt-7 border p-4"
              style={{ borderColor: "var(--rule)", background: "var(--paper-warm)" }}
            >
              <div className="mono mb-3 flex items-center gap-2" style={{ color: "var(--ink-faint)" }}>
                <Share2 size={12} strokeWidth={2} />
                Linked to
              </div>
              <p className="display text-[1.05rem]" style={{ fontStyle: "italic" }}>
                &ldquo;Cellular Respiration&rdquo;
              </p>
              <div className="mt-4 grid gap-2 border-t pt-3 sm:grid-cols-3" style={{ borderColor: "var(--rule)" }}>
                {[
                  "Krebs Cycle — wikilink",
                  "Mitochondria Structure — 91% match",
                  "Photosynthesis — 84% match",
                ].map((r) => (
                  <p key={r} className="mono flex items-center gap-2.5 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
                    <span style={{ color: "var(--vermilion)" }}>→</span>
                    {r}
                  </p>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
