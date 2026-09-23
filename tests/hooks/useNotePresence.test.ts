import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESENCE_HEARTBEAT_INTERVAL, useNotePresence } from "@/lib/hooks/presence/useNotePresence";
import type { Id } from "@/types/data-model";

const heartbeat = vi.fn<(args: { noteId: string }) => Promise<void>>(async () => {});
const leave = vi.fn<(args: { noteId: string }) => Promise<void>>(async () => {});

vi.mock("@/lib/hooks/presence/usePresenceActions", () => ({
  usePresenceActions: () => ({ heartbeat, leave }),
}));

const id = (value: string) => value as Id<"notes">;

beforeEach(() => {
  vi.useFakeTimers();
  heartbeat.mockClear();
  leave.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("useNotePresence", () => {
  it("sends nothing until the note has loaded", () => {
    const { unmount } = renderHook(() => useNotePresence(null));
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL * 3);
    unmount();
    // A link whose ?noteId= never loads (e.g. one crafted to point at another
    // endpoint) must not trigger the automatic heartbeat or leave requests.
    expect(heartbeat).not.toHaveBeenCalled();
    expect(leave).not.toHaveBeenCalled();
  });

  it("heartbeats on open and on each interval, and leaves on close", () => {
    const { unmount } = renderHook(() => useNotePresence(id("note_1")));
    expect(heartbeat).toHaveBeenCalledWith({ noteId: "note_1" });
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL * 2);
    expect(heartbeat).toHaveBeenCalledTimes(3);

    unmount();
    expect(leave).toHaveBeenCalledWith({ noteId: "note_1" });
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL * 2);
    expect(heartbeat).toHaveBeenCalledTimes(3);
  });

  it("leaves the old note when a different one loads", () => {
    const { rerender } = renderHook(({ noteId }) => useNotePresence(noteId), {
      initialProps: { noteId: id("note_1") as Id<"notes"> | null },
    });
    rerender({ noteId: id("note_2") });
    expect(leave).toHaveBeenCalledWith({ noteId: "note_1" });
    expect(heartbeat).toHaveBeenLastCalledWith({ noteId: "note_2" });
  });
});
