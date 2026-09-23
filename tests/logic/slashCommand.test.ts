import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { afterEach, describe, expect, it } from "vitest";
import {
  SlashCommand,
  renderItems,
} from "@/components/dashboard/editor/extensions/SlashCommand";
import type { SlashRegistryItem } from "@/components/dashboard/editor/slashCommandRegistry";

describe("slash command menu", () => {
  let editor: Editor | undefined;
  afterEach(() => editor?.destroy());

  async function typeSlash(extensions: Editor["options"]["extensions"]) {
    let changes = 0;
    editor = new Editor({
      editable: false,
      extensions: [
        ...extensions,
        SlashCommand.configure({
          suggestion: { render: () => renderItems(() => changes++) },
        }),
      ],
    });
    // NoteView makes the editor editable once the caller's role is known.
    editor.setEditable(true, false);
    editor.commands.focus("end");
    editor.commands.insertContent("/");
    // The suggestion view awaits items() before calling onStart.
    await new Promise((r) => setTimeout(r, 0));
    const items = (editor.slashCommandProps?.items ?? []) as SlashRegistryItem[];
    return { changes, ids: items.map((i) => i.id) };
  }

  it("opens when / is typed in an editor made editable after mount", async () => {
    const { changes, ids } = await typeSlash([StarterKit]);
    expect(changes).toBeGreaterThan(0);
    expect(ids).toContain("heading-1");
  });

  it("offers only blocks the editor can insert", async () => {
    const plain = await typeSlash([StarterKit]);
    expect(plain.ids).not.toContain("todo-list");
    expect(plain.ids).not.toContain("chart");
    editor?.destroy();

    const withTasks = await typeSlash([StarterKit, TaskList, TaskItem]);
    expect(withTasks.ids).toContain("todo-list");
  });
});
