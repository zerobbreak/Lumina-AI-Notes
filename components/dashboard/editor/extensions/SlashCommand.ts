import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
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

export const renderItems = () => {
  return {
    onStart: (props: any) => {
      props.editor.slashCommandProps = props;
    },
    onUpdate: (props: any) => {
      props.editor.slashCommandProps = props;
    },
    onKeyDown: (props: any) => {
      if (props.event.key === "Escape") {
        props.editor.slashCommandProps = null;
        return true;
      }
      return false;
    },
    onExit: (props: any) => {
      props.editor.slashCommandProps = null;
    },
  };
};
