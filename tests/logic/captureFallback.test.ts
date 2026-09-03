import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const pillSource = readFileSync(
  resolve(
    process.cwd(),
    "components/dashboard/transcribe/TranscriptionPill.tsx",
  ),
  "utf8",
);

describe("live capture transcription fallback", () => {
  it("always retries the complete original recording when isolation fails", () => {
    expect(pillSource).toMatch(
      /isolateAndTranscribe\(\{[\s\S]*?fallbackToOriginal:\s*true,[\s\S]*?\}\)/,
    );
    expect(pillSource).not.toContain(
      "fallbackToOriginal: liveTranscript.length === 0",
    );
  });
});
