import { Extension, type Editor } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import {
  filterSlashItems,
  type SlashRegistryItem,
} from "../slashCommandRegistry";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        items: ({ query }: { query: string }) =>
          filterSlashItems(query) as SlashRegistryItem[],
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: SlashRegistryItem;
        }) => {
          props.run(editor, range);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/** Called when the slash menu opens, updates, or closes so React can re-render (TipTap runs onStart/onUpdate after the transaction, so mutating the editor alone does not trigger useEditor). */
export const renderItems = (onSlashUiChange?: () => void) => {
  return {
    onStart: (props: any) => {
      props.editor.slashCommandProps = props;
      onSlashUiChange?.();
    },
    onUpdate: (props: any) => {
      props.editor.slashCommandProps = props;
      onSlashUiChange?.();
    },
    onKeyDown: (props: any) => {
      if (props.event.key === "Escape") {
        props.editor.slashCommandProps = null;
        onSlashUiChange?.();
        return true;
      }
      return false;
    },
    onExit: (props: any) => {
      props.editor.slashCommandProps = null;
      onSlashUiChange?.();
    },
  };
};
