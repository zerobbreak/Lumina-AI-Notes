import { Node, mergeAttributes, InputRule, CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathNodeView } from "./MathNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineMath: {
      setInlineMath: (latex: string) => ReturnType;
    };
    blockMath: {
      setBlockMath: (latex: string) => ReturnType;
    };
  }
}

// Inline math extension ($...$)
export const InlineMathExtension = Node.create({
  name: "inlineMath",

  group: "inline",

  inline: true,

  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-latex") || "",
        renderHTML: (attributes: { latex: string }) => ({
          "data-latex": attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "inline-math",
        class: "inline-math-container",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView, {
      as: "span",
    });
  },

  addInputRules() {
    return [
      // Match $...$ for inline math (but not $$...$$)
      new InputRule({
        find: /(?<!\$)\$([^$]+)\$(?!\$)/,
        handler: ({ state, range, match, chain }) => {
          const latex = match[1];
          if (!latex || latex.trim() === "") return;

          const node = this.type.create({ latex: latex.trim() });
          chain()
            .command(({ tr }) => {
              tr.replaceWith(range.from, range.to, node);
              return true;
            })
            .run();
        },
      }),
    ];
  },

  addCommands() {
    return {
      setInlineMath:
        (latex: string) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },
});

// Block math extension ($$...$$)
export const BlockMathExtension = Node.create({
  name: "blockMath",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-latex") || "",
        renderHTML: (attributes: { latex: string }) => ({
          "data-latex": attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="block-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "block-math",
        class: "block-math-container",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView, {
      as: "div",
    });
  },

  addInputRules() {
    return [
      // Match $$...$$ for block math at the start of a line
      new InputRule({
        find: /^\$\$([^$]+)\$\$\s*$/,
        handler: ({ state, range, match, chain }) => {
          const latex = match[1];
          if (!latex || latex.trim() === "") return;

          const node = this.type.create({ latex: latex.trim() });
          chain()
            .command(({ tr }) => {
              tr.replaceWith(range.from, range.to, node);
              return true;
            })
            .run();
        },
      }),
    ];
  },

  addCommands() {
    return {
      setBlockMath:
        (latex: string) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },
});

// Export both extensions as a combined array for easy use
export const MathExtensions = [InlineMathExtension, BlockMathExtension];
