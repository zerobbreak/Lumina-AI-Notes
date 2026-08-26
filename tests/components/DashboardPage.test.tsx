import { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";

const testState = vi.hoisted(() => ({
  noteId: "note-a",
  lifecycle: [] as string[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "noteId" ? testState.noteId : null),
  }),
}));

vi.mock("@/components/dashboard/editor/NoteView", () => ({
  default: ({ noteId }: { noteId: string }) => {
    useEffect(() => {
      testState.lifecycle.push(`mount:${noteId}`);
      return () => {
        testState.lifecycle.push(`unmount:${noteId}`);
      };
    }, [noteId]);
    return <div>{noteId}</div>;
  },
}));

describe("DashboardPage note routing", () => {
  it("starts a fresh editor session when the route changes notes", async () => {
    testState.noteId = "note-a";
    testState.lifecycle.length = 0;
    const view = render(<DashboardPage />);

    await waitFor(() => {
      expect(testState.lifecycle).toContain("mount:note-a");
    });

    testState.noteId = "note-b";
    view.rerender(<DashboardPage />);

    await waitFor(() => {
      expect(testState.lifecycle).toContain("unmount:note-a");
      expect(testState.lifecycle).toContain("mount:note-b");
    });
  });
});
