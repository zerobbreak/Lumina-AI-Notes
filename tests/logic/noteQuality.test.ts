import { describe, expect, it } from "vitest";
import {
  noteContentWordCount,
  notePlainText,
} from "@/convex/shared/noteQuality";

describe("note content text analysis", () => {
  it("counts visible words across adjacent editor blocks", () => {
    const content = "<h2>Cell biology</h2><p>Mitochondria make ATP.</p>";

    expect(notePlainText(content)).toBe("Cell biology Mitochondria make ATP.");
    expect(noteContentWordCount(content)).toBe(5);
  });

  it("uses the same 25-word threshold for short words", () => {
    const content = `<p>${Array.from({ length: 25 }, () => "a").join(" ")}</p>`;

    expect(noteContentWordCount(content)).toBe(25);
  });

  it("normalizes plain-text whitespace", () => {
    expect(noteContentWordCount(" one\n two\tthree ")).toBe(3);
  });
});
