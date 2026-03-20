"use client";

import React, {
  useState,
  useEffect,
  useRef,
} from "react";
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

interface SlashCommandMenuProps {
  editor: Editor;
  range: any;
}

export const SlashCommandMenu = ({ editor, range }: SlashCommandMenuProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items = [
    {
      title: "Text",
      description: "Just start typing with plain text.",
      icon: <Type className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode("paragraph").run();
      },
    },
    {
      title: "Heading 1",
      description: "Big section heading.",
      icon: <Heading1 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
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
      description: "Medium section heading.",
      icon: <Heading2 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
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
      description: "Small section heading.",
      icon: <Heading3 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a simple bulleted list.",
      icon: <List className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a list with numbering.",
      icon: <ListOrdered className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Todo List",
      description: "Track tasks with a todo list.",
      icon: <CheckSquare className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Code Block",
      description: "Capture code snippets.",
      icon: <Code className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Image",
      description: "Upload an image.",
      icon: <ImageIcon className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        // This will be handled by the parent component to open the upload dialog
        if (typeof window !== "undefined") {
          const event = new CustomEvent("open-image-upload");
          window.dispatchEvent(event);
        }
      },
    },
    {
      title: "Math Formula",
      description: "Insert a LaTeX formula.",
      icon: <Sigma className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setInlineMath("x^2 + y^2 = z^2")
          .run();
      },
    },
    {
      title: "Graph Calculator",
      description: "Insert an interactive graph.",
      icon: <Calculator className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertGraphCalculator().run();
      },
    },
    {
      title: "Chart",
      description: "Insert a data chart.",
      icon: <BarChart3 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).insertChart().run();
      },
    },
  ];

  const itemCount = items.length;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    setSelectedIndex(0);
  }, [range.from, range.to]);

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

  return (
    <div className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 p-1 shadow-xl scrollbar-hide">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
            index === selectedIndex
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          }`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/5 bg-zinc-800">
            {item.icon}
          </div>
          <div>
            <div className="font-medium">{item.title}</div>
            <div className="text-[11px] text-zinc-500">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
