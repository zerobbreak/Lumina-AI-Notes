"use client";

import React, {
  useState,
  useEffect,
  useRef,
  Fragment,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Image as ImageIcon,
  Calculator,
  BarChart3,
  Sigma,
  Type,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandMenuProps {
  editor: Editor;
  range: { from: number; to: number };
}

type SlashCommand = (props: {
  editor: Editor;
  range: { from: number; to: number };
}) => void;

type SlashItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: SlashCommand;
};

const SLASH_GROUPS: { label: string; items: SlashItem[] }[] = [
  {
    label: "Basic blocks",
    items: [
      {
        title: "Text",
        description: "Plain paragraph text.",
        icon: <Type className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).setNode("paragraph").run();
        },
      },
      {
        title: "Heading 1",
        description: "Large section title.",
        icon: <Heading1 className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 1 })
            .run();
        },
      },
      {
        title: "Heading 2",
        description: "Medium section title.",
        icon: <Heading2 className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 2 })
            .run();
        },
      },
      {
        title: "Heading 3",
        description: "Small section title.",
        icon: <Heading3 className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode("heading", { level: 3 })
            .run();
        },
      },
    ],
  },
  {
    label: "Lists",
    items: [
      {
        title: "Bullet list",
        description: "Unordered list with bullets.",
        icon: <List className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        title: "Numbered list",
        description: "Ordered list with numbers.",
        icon: <ListOrdered className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        title: "Todo list",
        description: "Checklist with tasks.",
        icon: <CheckSquare className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
    ],
  },
  {
    label: "Insert",
    items: [
      {
        title: "Code block",
        description: "Code with syntax highlighting.",
        icon: <Code className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
      },
      {
        title: "Image",
        description: "Upload or embed an image.",
        icon: <ImageIcon className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("open-image-upload"));
          }
        },
      },
      {
        title: "Math formula",
        description: "Inline LaTeX math.",
        icon: <Sigma className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setInlineMath("x^2 + y^2 = z^2")
            .run();
        },
      },
      {
        title: "Graph calculator",
        description: "Interactive graph.",
        icon: <Calculator className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertGraphCalculator().run();
        },
      },
      {
        title: "Chart",
        description: "Data visualization.",
        icon: <BarChart3 className="size-[15px] stroke-[1.75]" />,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertChart().run();
        },
      },
    ],
  },
];

export const SlashCommandMenu = ({ editor, range }: SlashCommandMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = useMemo(
    () => SLASH_GROUPS.flatMap((g) => g.items),
    [],
  );

  const itemCount = items.length;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [range.from, range.to]);

  useEffect(() => {
    const el = rowRefs.current[selectedIndex];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const selectItem = (index: number) => {
    const item = itemsRef.current[index];
    if (item) {
      item.command({ editor: editorRef.current, range: rangeRef.current });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i + itemCount - 1) % itemCount);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % itemCount);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setSelectedIndex((current) => {
          selectItem(current);
          return current;
        });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [itemCount]);

  let rowIndex = 0;

  return (
    <div
      role="listbox"
      aria-label="Block commands"
      className={cn(
        "slash-command-menu",
        "scrollbar-hide",
        "max-h-[min(22rem,50vh)] w-[min(20rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden",
        "rounded-xl border border-white/[0.08] bg-zinc-900/95 p-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.65)] backdrop-blur-md",
        "ring-1 ring-white/[0.04]",
      )}
    >
      {SLASH_GROUPS.map((group) => (
        <Fragment key={group.label}>
          <div
            className="px-2.5 pb-1.5 pt-2 first:pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500"
            role="presentation"
          >
            {group.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const index = rowIndex++;
              const selected = index === selectedIndex;
              return (
                <button
                  key={`${group.label}-${item.title}`}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectItem(index)}
                  className={cn(
                    "group relative flex w-full min-w-0 items-start gap-2.5 rounded-lg px-2 py-2 text-left",
                    "outline-none transition-colors duration-150",
                    "focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
                    !selected &&
                      "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="slash-command-selection"
                      className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/15 to-white/[0.06] ring-1 ring-white/[0.07]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-zinc-800/80 text-zinc-300 shadow-inner shadow-black/20",
                      "transition-colors duration-150",
                      selected &&
                        "border-indigo-400/25 bg-indigo-500/10 text-indigo-200",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="relative z-[1] min-w-0 flex-1 py-0.5">
                    <span
                      className={cn(
                        "block text-[13px] font-medium leading-tight tracking-tight",
                        selected ? "text-zinc-50" : "text-zinc-200",
                      )}
                    >
                      {item.title}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[11px] leading-snug",
                        selected ? "text-zinc-400" : "text-zinc-500",
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
};
