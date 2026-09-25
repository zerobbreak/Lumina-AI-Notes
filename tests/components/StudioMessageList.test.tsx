import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudioMessageList } from "@/components/dashboard/studio/StudioMessageList";
import type { ChatMessageModel } from "@/lib/api/adapters/chat";

afterEach(cleanup);

type Note = { id: string; title: string };

/** `cited` is the [#N] order; `notes` is what still exists (deleted ones drop out). */
const reply = (content: string, cited: string[] = [], notes: Note[] = []) =>
  ({ _id: "m1", role: "assistant", content, contextNoteIds: cited, notes }) as unknown as ChatMessageModel;

const renderReply = (content: string, cited?: string[], notes?: Note[]) => {
  const onOpenNote = vi.fn();
  const view = render(
    <StudioMessageList
      messages={[reply(content, cited, notes)]}
      isThinking={false}
      mode="explain"
      onOpenNote={onOpenNote}
    />,
  );
  return { ...view, onOpenNote };
};

describe("studio chat replies", () => {
  it("renders the AI's markdown as headings and lists", () => {
    renderReply("## 1) Definition\nA thing.\n\n## 2) Intuition\n- first point\n- second point\n\n1. step one\n2. step two");
    expect(screen.getByRole("heading", { level: 2, name: "1) Definition" })).toBeTruthy();
    const lists = screen.getAllByRole("list");
    expect(lists.map((l) => l.tagName)).toEqual(["UL", "OL"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("renders tables", () => {
    renderReply("| Term | Meaning |\n| --- | --- |\n| ETL | Extract, transform, load |");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Term" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "ETL" })).toBeTruthy();
  });

  it("turns [#n] citations into buttons that open the cited note", () => {
    const { onOpenNote } = renderReply("Env vars load in the API process [#1].", ["note_1"], [
      { id: "note_1", title: "Google Drive Clone" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Google Drive Clone/ }));
    expect(onOpenNote).toHaveBeenCalledWith("note_1");
  });

  it("keeps later citations pointing at the right note when an earlier one was deleted", () => {
    const { onOpenNote } = renderReply("First [#1], second [#2].", ["gone", "note_2"], [
      { id: "note_2", title: "Auth setup" },
    ]);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Auth setup/ }));
    expect(onOpenNote).toHaveBeenCalledWith("note_2");
  });

  it("splits grouped citations like [#1, #2] into one chip per note", () => {
    renderReply("Both notes agree [#1, #2].", ["note_1", "note_2"], [
      { id: "note_1", title: "Opus 5.5" },
      { id: "note_2", title: "Untitled Note" },
    ]);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "[#1]· Opus 5.5",
      "[#2]· Untitled Note",
    ]);
  });

  it("keeps a code block without a language as a block", () => {
    const { container } = renderReply("```\nnpm run dev\n```");
    expect(container.querySelector("pre > code")?.textContent).toBe("npm run dev\n");
  });
});
