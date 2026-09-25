import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stripQuestionLabel } from "../src/pipelines/recording/notes.js";

describe("review question labels", () => {
  it("drops a copied type label", () => {
    expect(stripQuestionLabel("Definition question: What is ATP?")).toBe("What is ATP?");
    expect(stripQuestionLabel("Analysis question:Why does it fail?")).toBe("Why does it fail?");
  });

  it("leaves ordinary questions alone", () => {
    expect(stripQuestionLabel("What question does the Krebs cycle answer?")).toBe(
      "What question does the Krebs cycle answer?",
    );
  });
});

// Example values in prompts get copied into what students see. These were
// seen (or could be seen) in real output; keep them out of the prompt text.
describe("prompt text", () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

  it("recording notes prompt has no labelled example questions", () => {
    expect(source("../src/pipelines/recording/notes.ts")).not.toContain('"Definition question: What is [concept]');
  });

  it("transcript cleanup prompt has no unfilled placeholder", () => {
    expect(source("../src/routes/ai.ts")).not.toContain("\\${count}");
  });
});
