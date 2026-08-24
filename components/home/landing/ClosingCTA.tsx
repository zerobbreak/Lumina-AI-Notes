import { LoginButton } from "@/components/auth/LoginButton";

export function ClosingCTA() {
  return (
    <section
      className="grain relative overflow-hidden border-t"
      style={{ background: "var(--ink)", color: "var(--paper)", borderColor: "var(--ink)" }}
    >
      <div className="relative mx-auto max-w-[1240px] px-6 py-28 md:px-10 md:py-36">
        <div className="reveal max-w-4xl">
          <p className="mono mb-10" style={{ color: "var(--gold)" }}>
            Free while the plans are paused
          </p>

          <h2 className="display" style={{ fontSize: "clamp(2.6rem, 6.4vw, 5rem)" }}>
            Next lecture is
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 500 }}>
              on{" "}
              <span style={{ color: "var(--vermilion)" }}>Tuesday</span>.
            </span>
          </h2>

          <p
            className="mt-8 text-[1.05rem] leading-relaxed"
            style={{ color: "rgba(242,237,227,0.68)", maxWidth: "38rem" }}
          >
            Set up your courses and modules once. After that, every recording
            and reading you feed it comes back as something you can revise from.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-x-9 gap-y-5">
            <LoginButton
              mode="signup"
              variant="ghost"
              className="h-[56px] rounded-none border px-9 text-[0.95rem] font-medium transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px]"
              style={{
                background: "var(--paper)",
                color: "var(--ink)",
                borderColor: "var(--paper)",
                boxShadow: "5px 5px 0 var(--vermilion)",
                fontFamily: "var(--font-plex)",
              }}
            >
              Create an account
            </LoginButton>

            <LoginButton
              variant="ghost"
              className="h-[56px] rounded-none px-0 text-[0.95rem] hover:bg-transparent"
              style={{ color: "rgba(242,237,227,0.75)", fontFamily: "var(--font-plex)" }}
            >
              I already have one
            </LoginButton>
          </div>
        </div>
      </div>
    </section>
  );
}
