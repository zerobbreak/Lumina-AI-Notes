import type { Editor } from "@tiptap/core";

export type SlashRange = { from: number; to: number };

export type SlashRegistryItem = {
  id: string;
  group: string;
  title: string;
  description: string;
  /** Lowercase tokens users can type after `/` to find this command */
  keywords: string[];
  run: (editor: Editor, range: SlashRange) => void;
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s/]+/)
    .map((t) => t.replace(/[^a-z0-9+#]/g, ""))
    .filter(Boolean);
}

function haystack(item: SlashRegistryItem): string {
  return [
    item.title,
    item.description,
    ...item.keywords,
    item.group,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Returns slash commands matching the query after `/`.
 * Empty query shows all commands in definition order.
 */
export function filterSlashItems(query: string | null | undefined): SlashRegistryItem[] {
  const q = normalize(query ?? "");
  if (!q) {
    return SLASH_REGISTRY;
  }

  const tokens = tokenize(q);
  if (tokens.length === 0) {
    return SLASH_REGISTRY;
  }

  return SLASH_REGISTRY.filter((item) => {
    const h = haystack(item);
    if (h.includes(q)) {
      return true;
    }
    return tokens.every((t) => {
      if (h.includes(t)) {
        return true;
      }
      return item.keywords.some((k) => k.includes(t) || t.includes(k));
    });
  });
}

const SLASH_REGISTRY: SlashRegistryItem[] = [
  {
    id: "text",
    group: "Basic blocks",
    title: "Text",
    description: "Plain paragraph text.",
    keywords: [
      "text",
      "paragraph",
      "plain",
      "body",
      "p",
      "normal",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setNode("paragraph").run();
    },
  },
  {
    id: "heading-1",
    group: "Basic blocks",
    title: "Heading 1",
    description: "Large section title.",
    keywords: [
      "h1",
      "heading",
      "title",
      "header",
      "large",
      "#",
      "section",
    ],
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    id: "heading-2",
    group: "Basic blocks",
    title: "Heading 2",
    description: "Medium section title.",
    keywords: ["h2", "heading", "subtitle", "medium", "##", "subsection"],
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    id: "heading-3",
    group: "Basic blocks",
    title: "Heading 3",
    description: "Small section title.",
    keywords: ["h3", "heading", "small", "###", "minor"],
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    id: "bullet-list",
    group: "Lists",
    title: "Bullet list",
    description: "Unordered list with bullets.",
    keywords: [
      "bullet",
      "bullets",
      "unordered",
      "ul",
      "list",
      "dash",
      "-",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "numbered-list",
    group: "Lists",
    title: "Numbered list",
    description: "Ordered list with numbers.",
    keywords: ["numbered", "ordered", "ol", "list", "numbers", "1"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "todo-list",
    group: "Lists",
    title: "Todo list",
    description: "Checklist with tasks.",
    keywords: [
      "todo",
      "task",
      "tasks",
      "checklist",
      "checkbox",
      "check",
      "done",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "code-block",
    group: "Insert",
    title: "Code block",
    description: "Code with syntax highlighting.",
    keywords: [
      "code",
      "codeblock",
      "syntax",
      "snippet",
      "programming",
      "developer",
      "```",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "image",
    group: "Insert",
    title: "Image",
    description: "Upload or embed an image.",
    keywords: [
      "image",
      "img",
      "picture",
      "photo",
      "upload",
      "embed",
      "media",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("open-image-upload"));
      }
    },
  },
  {
    id: "math",
    group: "Insert",
    title: "Math formula",
    description: "Inline LaTeX math.",
    keywords: [
      "math",
      "latex",
      "katex",
      "tex",
      "equation",
      "formula",
      "sigma",
      "inline",
    ],
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setInlineMath("x^2 + y^2 = z^2")
        .run();
    },
  },
  {
    id: "graph-calculator",
    group: "Insert",
    title: "Graph calculator",
    description: "Interactive graph.",
    keywords: [
      "graph",
      "plot",
      "calculator",
      "function",
      "curve",
      "axes",
      "interactive",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertGraphCalculator().run();
    },
  },
  {
    id: "chart",
    group: "Insert",
    title: "Chart",
    description: "Data visualization.",
    keywords: [
      "chart",
      "bar",
      "data",
      "visualization",
      "viz",
      "graph",
      "stats",
    ],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertChart().run();
    },
  },
];
