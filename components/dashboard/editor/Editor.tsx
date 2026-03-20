"use client";

import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  AnyExtension,
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
import { SlashCommandMenu } from "./SlashCommandMenu";
import { Plus, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { ResourceMentionNode } from "./ResourceMentionNode";
import { OutlineExtension } from "./extensions/OutlineExtension";
import { DiagramExtension } from "./extensions/DiagramExtension";
import { MathExtensions } from "./extensions/MathExtension";
import { CornellData, OutlineMetadata, NoteStyleType } from "@/types";
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
  onChange?: (content: string | CornellData) => void;
  placeholder?: string;
  styleType?: NoteStyleType;
  // Cornell-specific props
  cornellCues?: string;
  cornellNotes?: string;
  cornellSummary?: string;
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
  cornellCues: initialCornellCues,
  cornellNotes: initialCornellNotes,
  cornellSummary: initialCornellSummary,
  outlineData,
  outlineMetadata,
}: EditorProps) {
  // State for Cornell Notes sections
  const [cornellCues, setCornellCues] = useState(initialCornellCues || "");
  const [cornellSummary, setCornellSummary] = useState(
    initialCornellSummary || "",
  );
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
        render: renderItems,
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
    content:
      styleType === "cornell" ? initialCornellNotes || "" : initialContent,
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
      if (styleType === "cornell") {
        // For Cornell notes, combine all sections
        onChange?.({
          cornellCues,
          cornellNotes: editor.getHTML(),
          cornellSummary,
        });
      } else {
        onChange?.(editor.getHTML());
      }
    },
  });

  // Update Cornell sections when props change (loading different note)
  useEffect(() => {
    if (styleType === "cornell") {
      setCornellCues(initialCornellCues || "");
      setCornellSummary(initialCornellSummary || "");
      if (editor && initialCornellNotes !== undefined) {
        const currentContent = editor.getHTML();
        if (currentContent !== initialCornellNotes) {
          // Use queueMicrotask to schedule setContent outside of React's commit phase
          // This avoids the flushSync error since TipTap internally uses flushSync
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(initialCornellNotes || "");
            }
          });
        }
      }
    }
  }, [
    initialCornellCues,
    initialCornellNotes,
    initialCornellSummary,
    styleType,
    editor,
  ]);

  // Notify parent when Cornell cues or summary change
  useEffect(() => {
    if (styleType === "cornell" && editor) {
      onChange?.({
        cornellCues,
        cornellNotes: editor.getHTML(),
        cornellSummary,
      });
    }
  }, [cornellCues, cornellSummary]);

  // Effect to update content if it changes externally (for non-Cornell notes)
  useEffect(() => {
    if (
      styleType !== "cornell" &&
      editor &&
      initialContent !== editor.getHTML()
    ) {
      // Use queueMicrotask to schedule content updates outside of React's commit phase
      // This avoids the flushSync error since TipTap internally uses flushSync
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
  }, [initialContent, editor, styleType]);

  if (!editor) {
    return null;
  }

  // Render based on styleType
  if (styleType === "cornell") {
    return (
      <div className="cornell-container h-full flex flex-col">
        {/* Main Grid */}
        <div className="grid grid-cols-[300px_1fr] gap-6 flex-1 min-h-0">
          {/* Left Column - Cues */}
          <div className="border-r border-border p-6 bg-accent/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Cues & Questions
              </h3>
            </div>
            <textarea
              value={cornellCues}
              onChange={(e) => setCornellCues(e.target.value)}
              disabled={!isEditable}
              className="w-full h-[calc(100%-3rem)] bg-transparent resize-none focus:outline-none text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/50"
              placeholder="• Key terms&#10;• Important concepts&#10;• Review questions&#10;• Main ideas"
            />
          </div>

          {/* Right Column - Main Notes */}
          <div className="p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <span className="text-lg">📝</span>
              </div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Notes
              </h3>
            </div>
            <div className="flex-1 overflow-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Bottom Row - Summary */}
        <div className="border-t border-border p-6 bg-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Summary
            </h3>
          </div>
          <textarea
            value={cornellSummary}
            onChange={(e) => setCornellSummary(e.target.value)}
            disabled={!isEditable}
            className="w-full bg-transparent resize-none focus:outline-none text-foreground text-sm h-24 leading-relaxed placeholder:text-muted-foreground/50"
            placeholder="Summarize the main points in 2-3 sentences..."
          />
        </div>
      </div>
    );
  }

  if (styleType === "outline") {
    return (
      <div className="outline-mode-container">
        {/* Editor */}
        <div className="outline-editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  // Default Standard
  return (
    <div className="relative group/editor">
      {editor && (
        <FloatingMenu
          editor={editor}
          options={{
            placement: "left-start",
            offset: [12, 8], // 12px from the text, 8px down from the top of the line
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

      {editor && editor.slashCommandProps && (() => {
        const sc = editor.slashCommandProps;
        if (!sc) return null;
        const parentEl = editor.view.dom.parentElement;
        const parentRect = parentEl?.getBoundingClientRect();
        const cr = sc.clientRect?.() ?? null;
        const top = cr
          ? cr.top -
            (parentRect?.top ?? 0) +
            (parentEl?.scrollTop ?? 0) +
            24
          : 0;
        const left = cr
          ? cr.left - (parentRect?.left ?? 0)
          : 0;
        return (
          <div className="absolute z-50" style={{ top, left }}>
            <SlashCommandMenu editor={editor} range={sc.range} />
          </div>
        );
      })()}

      <EditorContent editor={editor} />
    </div>
  );
}
