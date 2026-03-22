"use client";

import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  AnyExtension,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import { FloatingMenu as FloatingMenuExtension } from "@tiptap/extension-floating-menu";
import { FloatingMenu } from "@tiptap/react/menus";
import { SlashCommand, renderItems } from "./extensions/SlashCommand";
import { SlashCommandLayer } from "./SlashCommandLayer";
import { Plus, GripVertical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ResourceMentionNode } from "./ResourceMentionNode";
import { OutlineExtension } from "./extensions/OutlineExtension";
import { DiagramExtension } from "./extensions/DiagramExtension";
import { MathExtensions } from "./extensions/MathExtension";
import { OutlineMetadata, NoteStyleType } from "@/types";
import "./editor.css";

const ResourceMention = Node.create({
  name: "resourceMention",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="resource-mention"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "resource-mention",
        class:
          "bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-medium inline-flex items-center gap-1 cursor-pointer select-none mx-1 align-middle",
      }),
      ["span", { class: "opacity-75" }, "📄"],
      HTMLAttributes.label,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResourceMentionNode);
  },
});

interface EditorProps {
  initialContent?: string;
  isEditable?: boolean;
  onChange?: (content: string) => void;
  placeholder?: string;
  styleType?: NoteStyleType;
  // Outline-specific props
  outlineData?: string;
  outlineMetadata?: OutlineMetadata;
}

export default function Editor({
  initialContent,
  isEditable = true,
  onChange,
  placeholder = "Start writing...",
  styleType = "standard",
  outlineData,
  outlineMetadata,
}: EditorProps) {
  const [slashUiTick, setSlashUiTick] = useState(0);
  const bumpSlashUi = useCallback(() => {
    setSlashUiTick((n) => n + 1);
  }, []);
  // Build extensions based on style type
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      ...(styleType === "outline"
        ? {
            bulletList: {
              HTMLAttributes: {
                class: "outline-bullet-list",
              },
              keepMarks: true,
              keepAttributes: true,
            },
            orderedList: {
              HTMLAttributes: {
                class: "outline-ordered-list",
              },
              keepMarks: true,
              keepAttributes: true,
            },
            listItem: {
              HTMLAttributes: {
                class: "outline-list-item",
              },
            },
          }
        : {}),
    }),
    Placeholder.configure({
      placeholder,
    }),
    SlashCommand.configure({
      suggestion: {
        render: () => renderItems(bumpSlashUi),
      },
    }),
    BubbleMenu,
    FloatingMenuExtension,
    ResourceMention,
    DiagramExtension, // Always include diagram support
    ...MathExtensions, // Math formula support (inline $...$ and block $$...$$)
  ];

  // Add outline-specific extensions
  if (styleType === "outline") {
    extensions.push(
      TaskList.configure({
        HTMLAttributes: {
          class: "outline-task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "outline-task-item",
        },
      }),
      Dropcursor.configure({
        color: "#6366f1",
        width: 2,
      }),
      OutlineExtension,
    );
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px]",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer) {
          const resourceId = event.dataTransfer.getData(
            "application/lumina-resource-id",
          );
          const resourceName = event.dataTransfer.getData(
            "application/lumina-resource-name",
          );

          if (resourceId && resourceName) {
            // Stop propagation to prevent global overlay/dropzone from firing
            event.preventDefault();
            event.stopPropagation();

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });

            if (coordinates) {
              editor
                ?.chain()
                .focus()
                .insertContentAt(coordinates.pos, {
                  type: "resourceMention",
                  attrs: { id: resourceId, label: resourceName },
                })
                .insertContentAt(coordinates.pos + 1, " ") // Add space after chip
                .run();
              return true; // Handled
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Effect to update content if it changes externally
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      queueMicrotask(() => {
        if (editor && !editor.isDestroyed) {
          if (initialContent) {
            editor.commands.setContent(initialContent);
          } else {
            editor.commands.clearContent();
          }
        }
      });
    }
  }, [initialContent, editor]);

  if (!editor) {
    return null;
  }

  // Render based on styleType
  if (styleType === "outline") {
    return (
      <div className="outline-mode-container">
        {/* Editor */}
        <div className="outline-editor-content relative">
          <SlashCommandLayer editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  // Default Standard
  return (
    <div className="relative group/editor" data-slash-ui={slashUiTick}>
      {editor && (
        <FloatingMenu
          editor={editor}
          options={{
            placement: "left-start",
            offset: { mainAxis: 12, crossAxis: 8 }, // gap from text; vertical skid along the line
          }}
          shouldShow={({ state }) => {
            const { selection } = state;
            const { $from } = selection;
            const isRootDepth = $from.depth === 1;
            const isEmpty = $from.parent.content.size === 0;
            const isParagraph = $from.parent.type.name === "paragraph";

            return isRootDepth && isEmpty && isParagraph;
          }}
        >
          <div className="flex items-center gap-0.5 opacity-0 group-hover/editor:opacity-100 transition-opacity pr-2">
            <button
              className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-zinc-300 transition-colors"
              onClick={() => {
                editor.chain().focus().insertContent("/").run();
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-600 cursor-grab active:cursor-grabbing hover:bg-white/10 hover:text-zinc-400 transition-colors">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        </FloatingMenu>
      )}

      <SlashCommandLayer editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
}
