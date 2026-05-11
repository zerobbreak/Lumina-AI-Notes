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
import type { SlashRegistryItem } from "./slashCommandRegistry";

interface SlashCommandMenuProps {
  editor: Editor;
  range: { from: number; to: number };
  /** Text after `/` — used to reset selection when the filter changes */
  query: string;
  items: SlashRegistryItem[];
}

const SLASH_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="size-[15px] stroke-[1.75]" />,
  "heading-1": <Heading1 className="size-[15px] stroke-[1.75]" />,
  "heading-2": <Heading2 className="size-[15px] stroke-[1.75]" />,
  "heading-3": <Heading3 className="size-[15px] stroke-[1.75]" />,
  "bullet-list": <List className="size-[15px] stroke-[1.75]" />,
  "numbered-list": <ListOrdered className="size-[15px] stroke-[1.75]" />,
  "todo-list": <CheckSquare className="size-[15px] stroke-[1.75]" />,
  "code-block": <Code className="size-[15px] stroke-[1.75]" />,
  image: <ImageIcon className="size-[15px] stroke-[1.75]" />,
  math: <Sigma className="size-[15px] stroke-[1.75]" />,
  "graph-calculator": <Calculator className="size-[15px] stroke-[1.75]" />,
  chart: <BarChart3 className="size-[15px] stroke-[1.75]" />,
};

function groupItems(
  items: SlashRegistryItem[],
): { label: string; items: SlashRegistryItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, SlashRegistryItem[]>();
  for (const item of items) {
    if (!map.has(item.group)) {
      order.push(item.group);
      map.set(item.group, []);
    }
    map.get(item.group)!.push(item);
  }
  return order.map((label) => ({
    label,
    items: map.get(label) ?? [],
  }));
}

export const SlashCommandMenu = ({
  editor,
  range,
  query,
  items,
}: SlashCommandMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const flatItems = items;
  const itemCount = flatItems.length;

  const itemsRef = useRef(flatItems);
  itemsRef.current = flatItems;
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const grouped = useMemo(() => groupItems(items), [items]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [range.from, range.to, query]);

  useEffect(() => {
    const el = rowRefs.current[selectedIndex];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const selectItem = (index: number) => {
    const item = itemsRef.current[index];
    if (item) {
      item.run(editorRef.current, rangeRef.current);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (itemCount === 0) {
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (i + itemCount - 1) % itemCount);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => (i + 1) % itemCount);
        return;
      }
      if (e.key === "Enter" || e.key === "NumpadEnter") {
        if (e.isComposing) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const idx = selectedIndexRef.current;
        selectItem(idx);
      }
    };

    // Capture phase: run before ProseMirror/TipTap handle Enter (otherwise a newline is inserted).
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
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
      {itemCount === 0 && (
        <div className="px-2.5 py-6 text-center text-[12px] text-zinc-500">
          No commands match that text. Try keywords like{" "}
          <span className="text-zinc-400">
            heading, list, code, image, math, chart
          </span>
          .
        </div>
      )}
      {grouped.map((group) => (
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
              const icon = SLASH_ICONS[item.id] ?? (
                <Type className="size-[15px] stroke-[1.75]" />
              );
              const keywordHint = item.keywords.slice(0, 8).join(" · ");
              return (
                <button
                  key={`${group.label}-${item.id}`}
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
                    {icon}
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
                    {keywordHint && (
                      <span
                        className={cn(
                          "mt-1 block text-[10px] leading-snug tracking-wide",
                          selected ? "text-zinc-500" : "text-zinc-600",
                        )}
                        title={`Search: ${item.keywords.join(", ")}`}
                      >
                        {keywordHint}
                      </span>
                    )}
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
