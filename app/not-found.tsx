import Link from "next/link";
import { PaperSurface } from "@/components/paper/PaperSurface";

export default function NotFound() {
  return (
    <PaperSurface className="grain relative flex min-h-screen flex-col">
      <header className="px-6 py-6 md:px-10">
        <Link href="/" className="display text-[1.5rem]" style={{ fontWeight: 700 }}>
          Lumina
        </Link>
      </header>

      <main className="flex flex-1 items-center px-6 pb-20 md:px-10">
        <div className="mx-auto w-full max-w-[1240px]">
          <div className="running-head mono mb-14">
            <span>Error</span>
            <span>404</span>
          </div>

          <div className="grid items-center gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
            <div>
              <p
                className="display enter leading-none"
                style={{ fontSize: "clamp(5rem, 15vw, 11rem)", color: "var(--vermilion)" }}
              >
                404
              </p>

              <h1
                className="display enter mt-6"
                style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)", ["--d" as string]: "0.08s" }}
              >
                Not in the index.
              </h1>

              <p
                className="enter mt-6 text-[1rem] leading-relaxed"
                style={{ color: "var(--ink-soft)", maxWidth: "32rem", ["--d" as string]: "0.16s" }}
              >
                This page has been moved, deleted, or never filed in the first
                place. Nothing you saved is affected — only this address is
                missing.
              </p>

              <div
                className="enter mt-10 flex flex-wrap items-center gap-x-8 gap-y-4"
                style={{ ["--d" as string]: "0.24s" }}
              >
                <Link
                  href="/"
                  className="flex h-[52px] items-center border px-7 text-[0.95rem] font-medium transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
                  style={{
                    background: "var(--ink)",
                    color: "var(--paper)",
                    borderColor: "var(--ink)",
                    boxShadow: "5px 5px 0 var(--vermilion)",
                  }}
                >
                  Back to the front page
                </Link>

                <Link href="/dashboard" className="rule-link text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>
                  Go to your dashboard →
                </Link>
              </div>
            </div>

            {/* A torn-out leaf: the page that isn't here. */}
            <figure
              className="enter-figure relative mx-auto hidden w-full max-w-[21rem] lg:block"
              style={{ transform: "rotate(-1.4deg)", ["--d" as string]: "0.2s" }}
            >
              <div className="card">
                <header
                  className="flex items-center justify-between border-b px-5 py-3"
                  style={{ borderColor: "var(--ink)", background: "var(--paper-warm)" }}
                >
                  <span className="mono">Missing page</span>
                  <span className="mono" style={{ color: "var(--vermilion)" }}>
                    Not found
                  </span>
                </header>

                <div className="ruled px-5 py-6">
                  {[92, 78, 96, 64, 88, 71, 45].map((w, i) => (
                    <div
                      key={w}
                      className="h-[9px]"
                      style={{
                        width: `${w}%`,
                        marginBottom: "23px",
                        background: "var(--rule-soft)",
                        opacity: 1 - i * 0.11,
                      }}
                    />
                  ))}
                  <p className="mono pt-2" style={{ color: "var(--ink-faint)" }}>
                    Fig. — nothing filed here
                  </p>
                </div>
              </div>
            </figure>
          </div>
        </div>
      </main>
    </PaperSurface>
  );
}
