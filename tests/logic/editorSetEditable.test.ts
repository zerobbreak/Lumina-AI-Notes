import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * NoteView autosaves whatever onUpdate reports. Toggling editability on a
 * just-mounted editor reported the empty document as an edit, and the
 * autosave then wrote it over the note.
 */
describe("TipTap setEditable", () => {
  let editor: Editor | undefined;
  afterEach(() => editor?.destroy());

  it("emits an update unless told not to, so NoteView passes false", () => {
    const onUpdate = vi.fn();
    editor = new Editor({ extensions: [StarterKit], editable: false, onUpdate });

    editor.setEditable(true, false);
    expect(onUpdate).not.toHaveBeenCalled();

    editor.setEditable(false);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
