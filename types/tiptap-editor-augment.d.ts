import type { Editor as TiptapEditor } from "@tiptap/core";

/**
 * Slash command suggestion stores transient UI props on the editor instance
 * (see extensions/SlashCommand.ts renderItems).
 */
declare module "@tiptap/core" {
  interface Editor {
    slashCommandProps?: {
      editor: TiptapEditor;
      range: { from: number; to: number };
      query?: string;
      items?: unknown[];
      clientRect?: (() => DOMRect | null) | null;
      [key: string]: unknown;
    } | null;
  }
}

export {};
