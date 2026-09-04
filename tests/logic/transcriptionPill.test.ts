/**
 * Tests for the transcription pill's pure phase logic and the keyword-search
 * helpers shared between the Convex query and the pill's result renderer.
 */
import { describe, it, expect } from "vitest";

import {
  formatElapsed,
  hasGeneratedNoteContent,
  idleWaveform,
  mirrorLevels,
  phaseLabel,
  resolvePhase,
  THINKING_STAGES,
  thinkingStageIndex,
} from "@/components/dashboard/transcribe/pillPhases";
import {
  buildKeywordSnippet,
  countKeywordHits,
  parseKeywords,
  splitHighlightSegments,
  stripHtmlToText,
} from "@/convex/shared/keywordSearch";
import {
  MAX_REFERENCE_URLS,
  normalizeReferenceUrlList,
} from "@/convex/shared/urlContent";
import { normalizeTranscriptForPrompt } from "@/convex/shared/transcript";

const base = {
  isRecording: false,
  isThinking: false,
  isSearchOpen: false,
  hasTranscript: false,
  hasNotes: false,
};

describe("resolvePhase", () => {
  it("defaults to idle with nothing captured", () => {
    expect(resolvePhase(base)).toBe("idle");
  });

  it("prefers search over every other state", () => {
    expect(
      resolvePhase({
        ...base,
        isSearchOpen: true,
        isRecording: true,
        isThinking: true,
        hasNotes: true,
      }),
    ).toBe("searching");
  });

  it("prefers isolating over thinking once the mic is closed", () => {
    expect(
      resolvePhase({
        ...base,
        isIsolating: true,
        isThinking: true,
        hasTranscript: true,
      }),
    ).toBe("isolating");
  });

  it("never reports listening while the mic is closed", () => {
    expect(resolvePhase({ ...base, isThinking: true })).toBe("thinking");
    expect(resolvePhase({ ...base, isRecording: true, isThinking: true })).toBe(
      "listening",
    );
  });

  it("shows ready once notes exist, even with a transcript present", () => {
    expect(
      resolvePhase({ ...base, hasTranscript: true, hasNotes: true }),
    ).toBe("ready");
  });

  it("falls back to paused when a transcript exists but notes do not", () => {
    expect(resolvePhase({ ...base, hasTranscript: true })).toBe("paused");
  });
});

describe("hasGeneratedNoteContent", () => {
  it("rejects backend failure responses with no usable sections", () => {
    expect(
      hasGeneratedNoteContent({
        sections: [],
      }),
    ).toBe(false);
    expect(
      hasGeneratedNoteContent({
        sections: [{ content: "   " }],
      }),
    ).toBe(false);
  });

  it("accepts generated notes with substantive section content", () => {
    expect(
      hasGeneratedNoteContent({
        sections: [{ content: "A generated explanation." }],
      }),
    ).toBe(true);
  });
});

describe("formatElapsed", () => {
  it("uses m:ss below an hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9)).toBe("0:09");
    expect(formatElapsed(75)).toBe("1:15");
  });

  it("switches to h:mm:ss past an hour", () => {
    expect(formatElapsed(3661)).toBe("1:01:01");
  });

  it("clamps nonsense input instead of rendering NaN", () => {
    expect(formatElapsed(-5)).toBe("0:00");
    expect(formatElapsed(Number.NaN)).toBe("0:00");
  });
});

describe("thinkingStageIndex", () => {
  it("starts on the first stage", () => {
    expect(thinkingStageIndex(0)).toBe(0);
    expect(thinkingStageIndex(-100)).toBe(0);
  });

  it("advances through the stages over time", () => {
    expect(thinkingStageIndex(2500)).toBe(1);
    expect(thinkingStageIndex(5000)).toBe(2);
  });

  it("holds on the last stage instead of looping back", () => {
    const last = THINKING_STAGES.length - 1;
    expect(thinkingStageIndex(999_999)).toBe(last);
  });
});

describe("waveform helpers", () => {
  it("mirrors bands symmetrically around the centre", () => {
    expect(mirrorLevels([1, 2, 3, 4])).toEqual([2, 1, 1, 2]);
  });

  it("returns an empty meter for empty input", () => {
    expect(mirrorLevels([])).toEqual([]);
  });

  it("produces a deterministic idle shape (no hydration drift)", () => {
    expect(idleWaveform(6)).toEqual(idleWaveform(6));
    expect(idleWaveform(6)).toHaveLength(6);
  });
});

describe("phaseLabel", () => {
  it("names every phase", () => {
    expect(phaseLabel("listening")).toBe("Listening");
    expect(phaseLabel("isolating")).toBe("Isolating speech");
    expect(phaseLabel("thinking")).toBe("Thinking");
    expect(phaseLabel("ready")).toBe("Notes ready");
    expect(phaseLabel("idle")).toBe("Transcribe session");
  });
});

describe("stripHtmlToText", () => {
  it("drops tags and decodes entities", () => {
    expect(stripHtmlToText("<p>Big <b>O</b> &amp; theta</p>")).toBe(
      "Big O & theta",
    );
  });

  it("removes script and style bodies entirely", () => {
    expect(stripHtmlToText("<style>p{color:red}</style><p>Kept</p>")).toBe(
      "Kept",
    );
  });
});

describe("parseKeywords", () => {
  it("lowercases, splits, and dedupes", () => {
    expect(parseKeywords("Binary  SEARCH binary")).toEqual([
      "binary",
      "search",
    ]);
  });

  it("drops single characters that would match everything", () => {
    expect(parseKeywords("a of x")).toEqual(["of"]);
  });
});

describe("countKeywordHits", () => {
  it("counts distinct keywords, not repetitions", () => {
    expect(countKeywordHits("tree tree tree", ["tree", "graph"])).toBe(1);
    expect(countKeywordHits("tree and graph", ["tree", "graph"])).toBe(2);
  });
});

describe("buildKeywordSnippet", () => {
  it("centres the window on the first match", () => {
    const text = `${"x".repeat(400)} recursion ${"y".repeat(400)}`;
    const snippet = buildKeywordSnippet(text, ["recursion"], 40);
    expect(snippet).toContain("recursion");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("falls back to the head of the text when nothing matches", () => {
    expect(buildKeywordSnippet("short note body", ["absent"], 40)).toBe(
      "short note body",
    );
  });

  it("returns empty for empty input", () => {
    expect(buildKeywordSnippet("", ["x"])).toBe("");
  });
});

describe("splitHighlightSegments", () => {
  it("marks matched runs and leaves the rest plain", () => {
    expect(splitHighlightSegments("a tree here", ["tree"])).toEqual([
      { text: "a ", match: false },
      { text: "tree", match: true },
      { text: " here", match: false },
    ]);
  });

  it("is case-insensitive but preserves the original casing", () => {
    const [, matched] = splitHighlightSegments("The Tree", ["tree"]);
    expect(matched).toEqual({ text: "Tree", match: true });
  });

  it("reassembles losslessly", () => {
    const snippet = "graphs and trees and graphs";
    const joined = splitHighlightSegments(snippet, ["graphs", "trees"])
      .map((s) => s.text)
      .join("");
    expect(joined).toBe(snippet);
  });

  it("prefers the longer keyword when two overlap", () => {
    const segments = splitHighlightSegments("algorithm", ["algo", "algorithm"]);
    expect(segments).toEqual([{ text: "algorithm", match: true }]);
  });

  it("returns the snippet unmarked when there are no usable keywords", () => {
    expect(splitHighlightSegments("plain", [])).toEqual([
      { text: "plain", match: false },
    ]);
  });
});

describe("normalizeReferenceUrlList (reference links accepted by the sidebar)", () => {
  it("adds a scheme to bare hosts", () => {
    expect(normalizeReferenceUrlList(["docs.example.com/syllabus"])).toEqual([
      "https://docs.example.com/syllabus",
    ]);
  });

  it("dedupes equivalent URLs", () => {
    expect(
      normalizeReferenceUrlList(["example.com", "https://example.com"]),
    ).toEqual(["https://example.com/"]);
  });

  it("caps the list at the shared maximum", () => {
    const many = Array.from({ length: 12 }, (_, i) => `https://e${i}.com`);
    expect(normalizeReferenceUrlList(many)).toHaveLength(MAX_REFERENCE_URLS);
  });

  it("rejects junk instead of forwarding it to the fetcher", () => {
    expect(normalizeReferenceUrlList(["not a url", ""])).toEqual([]);
  });

  it("rejects loopback and private hosts (server-side fetch safety)", () => {
    expect(
      normalizeReferenceUrlList([
        "http://localhost:8080/admin",
        "http://127.0.0.1/",
        "http://192.168.1.1/",
        "http://169.254.169.254/latest/meta-data/",
      ]),
    ).toEqual([]);
  });

  it("rejects non-http schemes", () => {
    expect(normalizeReferenceUrlList(["file:///etc/passwd"])).toEqual([]);
  });
});

describe("normalizeTranscriptForPrompt (session replay from the sidebar)", () => {
  it("prefers each chunk's AI-enhanced text over raw dictation", () => {
    const raw = JSON.stringify([
      { text: "raw one", enhancedText: "clean one", timestamp: "00:00" },
    ]);
    expect(normalizeTranscriptForPrompt(raw)).toBe("[00:00] clean one");
  });

  it("falls back to raw text when no enhancement exists", () => {
    const raw = JSON.stringify([{ text: "just raw" }]);
    expect(normalizeTranscriptForPrompt(raw)).toBe("just raw");
  });

  it("passes legacy plain-text sessions through unchanged", () => {
    expect(normalizeTranscriptForPrompt("an older session")).toBe(
      "an older session",
    );
  });

  it("returns empty for an empty transcript", () => {
    expect(normalizeTranscriptForPrompt("   ")).toBe("");
  });
});

describe("normalizeReferenceUrlList — scheme handling regression", () => {
  it("rejects non-http schemes rather than coining a bogus https URL", () => {
    for (const bad of [
      "file:///etc/passwd",
      "javascript:alert(1)",
      "data:text/html,<script>",
      "ftp://example.com/x",
    ]) {
      expect(normalizeReferenceUrlList([bad])).toEqual([]);
    }
  });

  it("still accepts a bare host that merely contains a colon (port)", () => {
    expect(normalizeReferenceUrlList(["example.com:8443/docs"])).toEqual([
      "https://example.com:8443/docs",
    ]);
  });
});
