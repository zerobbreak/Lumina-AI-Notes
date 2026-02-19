import { describe, it, expect } from "vitest";
import {
  buildEnrichedTranscript,
  INITIAL_STREAMING_STATE,
  CODE_LANGUAGES,
} from "../../types/streaming";
import type { CodeBlock, StreamingNotesState } from "../../types/streaming";

// ============================================================================
// buildEnrichedTranscript
// ============================================================================

describe("buildEnrichedTranscript", () => {
  const baseTranscript = "The professor discussed binary search algorithms.";

  it("returns original transcript when no code blocks provided", () => {
    expect(buildEnrichedTranscript(baseTranscript)).toBe(baseTranscript);
  });

  it("returns original transcript when empty array provided", () => {
    expect(buildEnrichedTranscript(baseTranscript, [])).toBe(baseTranscript);
  });

  it("appends a single code block correctly", () => {
    const blocks: CodeBlock[] = [
      {
        id: "1",
        language: "python",
        content: "def binary_search(arr, target):\n    pass",
        startIndex: 0,
        endIndex: 40,
      },
    ];

    const result = buildEnrichedTranscript(baseTranscript, blocks);
    expect(result).toContain("=== EXTRACTED CODE BLOCKS FROM LECTURE ===");
    expect(result).toContain("```python");
    expect(result).toContain("def binary_search");
    expect(result).toContain("Code Block 1");
  });

  it("includes label when provided", () => {
    const blocks: CodeBlock[] = [
      {
        id: "1",
        language: "javascript",
        content: "const x = 1;",
        startIndex: 0,
        endIndex: 12,
        label: "Variable declaration",
      },
    ];

    const result = buildEnrichedTranscript(baseTranscript, blocks);
    expect(result).toContain("(Variable declaration)");
  });

  it("handles multiple code blocks", () => {
    const blocks: CodeBlock[] = [
      {
        id: "1",
        language: "python",
        content: "x = 1",
        startIndex: 0,
        endIndex: 5,
      },
      {
        id: "2",
        language: "javascript",
        content: "const y = 2;",
        startIndex: 10,
        endIndex: 22,
        label: "JS example",
      },
    ];

    const result = buildEnrichedTranscript(baseTranscript, blocks);
    expect(result).toContain("Code Block 1");
    expect(result).toContain("Code Block 2");
    expect(result).toContain("```python");
    expect(result).toContain("```javascript");
    expect(result).toContain("(JS example)");
  });

  it("preserves original transcript content", () => {
    const blocks: CodeBlock[] = [
      {
        id: "1",
        language: "python",
        content: "pass",
        startIndex: 0,
        endIndex: 4,
      },
    ];

    const result = buildEnrichedTranscript(baseTranscript, blocks);
    expect(result.startsWith(baseTranscript)).toBe(true);
  });
});

// ============================================================================
// INITIAL_STREAMING_STATE
// ============================================================================

describe("INITIAL_STREAMING_STATE", () => {
  it("has correct default values", () => {
    expect(INITIAL_STREAMING_STATE.isStreaming).toBe(false);
    expect(INITIAL_STREAMING_STATE.content).toBe("");
    expect(INITIAL_STREAMING_STATE.fullContent).toBe("");
    expect(INITIAL_STREAMING_STATE.progress).toBe(0);
    expect(INITIAL_STREAMING_STATE.phase).toBe("idle");
    expect(INITIAL_STREAMING_STATE.error).toBeUndefined();
  });
});

// ============================================================================
// CODE_LANGUAGES
// ============================================================================

describe("CODE_LANGUAGES", () => {
  it("contains expected popular languages", () => {
    expect(CODE_LANGUAGES).toContain("javascript");
    expect(CODE_LANGUAGES).toContain("typescript");
    expect(CODE_LANGUAGES).toContain("python");
    expect(CODE_LANGUAGES).toContain("java");
    expect(CODE_LANGUAGES).toContain("sql");
    expect(CODE_LANGUAGES).toContain("pseudocode");
  });

  it("includes 'other' as a catch-all", () => {
    expect(CODE_LANGUAGES).toContain("other");
  });

  it("has no duplicates", () => {
    const unique = new Set(CODE_LANGUAGES);
    expect(unique.size).toBe(CODE_LANGUAGES.length);
  });
});

// ============================================================================
// State type correctness
// ============================================================================

describe("StreamingNotesState type usage", () => {
  it("accepts valid state transitions", () => {
    const generating: StreamingNotesState = {
      isStreaming: true,
      content: "",
      fullContent: "",
      progress: 10,
      phase: "generating",
    };
    expect(generating.phase).toBe("generating");

    const animating: StreamingNotesState = {
      isStreaming: true,
      content: "Partial text...",
      fullContent: "Full text here",
      progress: 70,
      phase: "animating",
    };
    expect(animating.content).toBe("Partial text...");

    const complete: StreamingNotesState = {
      isStreaming: false,
      content: "Full text here",
      fullContent: "Full text here",
      progress: 100,
      phase: "complete",
    };
    expect(complete.progress).toBe(100);

    const errorState: StreamingNotesState = {
      isStreaming: false,
      content: "",
      fullContent: "",
      progress: 0,
      phase: "error",
      error: "API failed",
    };
    expect(errorState.error).toBe("API failed");
  });
});
