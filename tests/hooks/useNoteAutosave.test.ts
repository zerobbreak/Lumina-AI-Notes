import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNoteAutosave } from "@/lib/hooks/notes/useNoteAutosave";

type Props = { noteId: string; content: string | null; canSave: boolean; tick?: number };

let saves: Array<{ noteId: string; content: string; resolve: () => void; reject: (e: unknown) => void }>;
const onSaved = vi.fn();
const onError = vi.fn();

function setup(initial: Props) {
  return renderHook(
    (props: Props) =>
      useNoteAutosave({
        noteId: props.noteId,
        content: props.content,
        canSave: props.canSave,
        // A new function each render, as NoteView's closures are.
        save: (noteId, content) =>
          new Promise<void>((resolve, reject) => saves.push({ noteId, content, resolve, reject })),
        onSaved: () => onSaved(),
        onError: (e) => onError(e),
        delayMs: 1000,
      }),
    { initialProps: initial },
  );
}

/** Finishes the oldest pending save. */
async function finishSave(ok = true) {
  const next = saves.find((s) => !("done" in s));
  if (!next) throw new Error("no save pending");
  Object.assign(next, { done: true });
  await act(async () => {
    if (ok) next.resolve();
    else next.reject(new Error("409"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  saves = [];
  onSaved.mockReset();
  onError.mockReset();
});
afterEach(() => vi.useRealTimers());

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useNoteAutosave", () => {
  it("saves once after the user stops typing", async () => {
    const view = setup({ noteId: "n1", content: "<p>a</p>", canSave: true });
    view.rerender({ noteId: "n1", content: "<p>ab</p>", canSave: true });
    await advance(999);
    expect(saves).toHaveLength(0);
    await advance(1);
    expect(saves.map((s) => s.content)).toEqual(["<p>ab</p>"]);
    await finishSave();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("doesn't save the same content again when the page re-renders", async () => {
    // Each save refreshes the note in the cache, which re-renders NoteView.
    const view = setup({ noteId: "n1", content: "<p>notes</p>", canSave: true, tick: 0 });
    await advance(1000);
    await finishSave();
    for (let tick = 1; tick <= 20; tick++) {
      view.rerender({ noteId: "n1", content: "<p>notes</p>", canSave: true, tick });
      await advance(1000);
    }
    expect(saves).toHaveLength(1);
  });

  it("skips a save when edits end up back at what's already saved", async () => {
    const view = setup({ noteId: "n1", content: "<p>a</p>", canSave: true });
    await advance(1000);
    await finishSave();
    // Type, then undo, within the debounce window.
    view.rerender({ noteId: "n1", content: "<p>ab</p>", canSave: true });
    await advance(300);
    view.rerender({ noteId: "n1", content: "<p>a</p>", canSave: true });
    await advance(1000);
    expect(saves).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(2);
  });

  it("keeps saving on schedule while the page re-renders constantly", async () => {
    const view = setup({ noteId: "n1", content: "<p>x</p>", canSave: true, tick: 0 });
    for (let tick = 1; tick <= 50; tick++) {
      view.rerender({ noteId: "n1", content: "<p>x</p>", canSave: true, tick });
      await advance(25);
    }
    expect(saves).toHaveLength(1);
  });

  it("never runs two saves at once, and saves edits made meanwhile right after", async () => {
    const view = setup({ noteId: "n1", content: "<p>v1</p>", canSave: true });
    await advance(1000);
    expect(saves).toHaveLength(1);

    view.rerender({ noteId: "n1", content: "<p>v2</p>", canSave: true });
    await advance(1000);
    // v1 is still in flight: v2 must wait, or it would carry v1's version and 409.
    expect(saves).toHaveLength(1);

    await finishSave();
    expect(saves.map((s) => s.content)).toEqual(["<p>v1</p>", "<p>v2</p>"]);
    await finishSave();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("waits until the note can be saved", async () => {
    const view = setup({ noteId: "n1", content: "<p>early</p>", canSave: false });
    await advance(5000);
    expect(saves).toHaveLength(0);
    view.rerender({ noteId: "n1", content: "<p>early</p>", canSave: true });
    await advance(1000);
    expect(saves).toHaveLength(1);
  });

  it("reports a failed save, and tries again on the next edit", async () => {
    const view = setup({ noteId: "n1", content: "<p>a</p>", canSave: true });
    await advance(1000);
    await finishSave(false);
    expect(onError).toHaveBeenCalledTimes(1);

    view.rerender({ noteId: "n1", content: "<p>ab</p>", canSave: true });
    await advance(1000);
    expect(saves.at(-1)?.content).toBe("<p>ab</p>");
  });
});
