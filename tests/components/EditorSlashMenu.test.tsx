import { render, screen, waitFor, act } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Editor from "@/components/dashboard/editor/Editor";

vi.mock("@/lib/hooks/ai/useAiActions", () => ({ useAiActions: () => ({}) }));

/**
 * Outline notes render the shared Editor, which once dropped the slash
 * extension while still drawing its menu layer: typing "/" did nothing.
 */
describe("Editor slash menu", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView ??= function () {};
  });

  it.each(["outline", "standard"] as const)("opens on / in a %s note", async (styleType) => {
    const { container } = render(
      <Editor styleType={styleType} initialContent="<p></p>" onChange={() => {}} isEditable />,
    );
    const prose = await waitFor(() => {
      const el = container.querySelector(".ProseMirror");
      expect(el).toBeTruthy();
      return el as HTMLElement & { editor: import("@tiptap/core").Editor };
    });

    await act(async () => {
      prose.editor.chain().focus("end").insertContent("/").run();
      await new Promise((r) => setTimeout(r, 10));
    });

    const menu = await screen.findByRole("listbox", { name: "Block commands" });
    expect(menu.textContent).toContain("Heading 1");
  });
});
