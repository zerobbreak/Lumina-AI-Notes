import { describe, expect, it } from "vitest";

import {
  getNoteEmbeddingSnapshot,
  noteEmbeddingInput,
} from "@/convex/shared/noteEmbedding";

describe("getNoteEmbeddingSnapshot", () => {
  it("schedules meaningful new note content", () => {
    expect(
      getNoteEmbeddingSnapshot(null, {
        title: "Thermodynamics",
        content: "<p>Entropy increases in an isolated system.</p>",
      }),
    ).toEqual({
      title: "Thermodynamics",
      content: "<p>Entropy increases in an isolated system.</p>",
    });
  });

  it("does not reschedule unchanged or placeholder notes", () => {
    const note = {
      title: "Thermodynamics",
      content: "<p>Entropy increases in an isolated system.</p>",
    };

    expect(getNoteEmbeddingSnapshot(note, note)).toBeNull();
    expect(
      getNoteEmbeddingSnapshot(null, {
        title: "Untitled",
        content: "<p></p>",
      }),
    ).toBeNull();
  });

  it("preserves the exact snapshot used for stale-write checks", () => {
    const snapshot = {
      title: "Updated title",
      content: "<p>Updated content with enough text to embed.</p>",
    };

    expect(
      getNoteEmbeddingSnapshot(
        { title: "Old title", content: snapshot.content },
        snapshot,
      ),
    ).toEqual(snapshot);
    expect(noteEmbeddingInput(snapshot)).toBe(
      `${snapshot.title}\n\n${snapshot.content}`,
    );
  });
});
