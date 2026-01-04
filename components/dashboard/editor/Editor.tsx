"use client";

import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Dropcursor } from '@tiptap/extension-dropcursor';
import { useEffect, useState } from "react";
import { ResourceMentionNode } from "./ResourceMentionNode";
import { OutlineExtension } from "./extensions/OutlineExtension";
import { DiagramExtension } from "./extensions/DiagramExtension";
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

interface CornellData {
  cornellCues: string;
  cornellNotes: string;
  cornellSummary: string;
}

interface OutlineMetadata {
  totalItems: number;
  completedTasks: number;
  collapsedNodes: string[];
}

interface EditorProps {
  initialContent?: string;
  isEditable?: boolean;
  onChange?: (content: string | CornellData) => void;
  placeholder?: string;
  styleType?: "standard" | "cornell" | "outline" | "mindmap";
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
  const [cornellSummary, setCornellSummary] = useState(initialCornellSummary || "");

  // Build extensions based on style type
  const extensions = [
    StarterKit.configure({
      ...(styleType === "outline" ? {
        bulletList: {
          HTMLAttributes: {
            class: 'outline-bullet-list',
          },
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          HTMLAttributes: {
            class: 'outline-ordered-list',
          },
          keepMarks: true,
          keepAttributes: true,
        },
        listItem: {
          HTMLAttributes: {
            class: 'outline-list-item',
          },
        },
      } : {}),
    }),
    Placeholder.configure({
      placeholder,
    }),
    ResourceMention,
    DiagramExtension, // Always include diagram support
  ];

  // Add outline-specific extensions
  if (styleType === "outline") {
    extensions.push(
      TaskList.configure({
        HTMLAttributes: {
          class: 'outline-task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'outline-task-item',
        },
      }),
      Dropcursor.configure({
        color: '#6366f1',
        width: 2,
      }),
      OutlineExtension
    );
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: styleType === "cornell" ? initialCornellNotes || "" : initialContent,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px]",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer) {
          const resourceId = event.dataTransfer.getData(
            "application/lumina-resource-id"
          );
          const resourceName = event.dataTransfer.getData(
            "application/lumina-resource-name"
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
          editor.commands.setContent(initialCornellNotes || "");
        }
      }
    }
  }, [initialCornellCues, initialCornellNotes, initialCornellSummary, styleType, editor]);

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
    if (styleType !== "cornell" && editor && initialContent !== editor.getHTML()) {
      if (initialContent) {
        editor.commands.setContent(initialContent);
      } else {
        editor.commands.clearContent();
      }
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
          <div className="border-r border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <span className="text-lg">💡</span>
              </div>
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Cues & Questions
              </h3>
            </div>
            <textarea
              value={cornellCues}
              onChange={(e) => setCornellCues(e.target.value)}
              disabled={!isEditable}
              className="w-full h-[calc(100%-3rem)] bg-transparent resize-none focus:outline-none text-gray-300 text-sm leading-relaxed placeholder:text-gray-600"
              placeholder="• Key terms&#10;• Important concepts&#10;• Review questions&#10;• Main ideas"
            />
          </div>

          {/* Right Column - Main Notes */}
          <div className="p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <span className="text-lg">📝</span>
              </div>
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Notes
              </h3>
            </div>
            <div className="flex-1 overflow-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Bottom Row - Summary */}
        <div className="border-t border-white/10 p-6 bg-gradient-to-br from-white/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Summary
            </h3>
          </div>
          <textarea
            value={cornellSummary}
            onChange={(e) => setCornellSummary(e.target.value)}
            disabled={!isEditable}
            className="w-full bg-transparent resize-none focus:outline-none text-gray-300 text-sm h-24 leading-relaxed placeholder:text-gray-600"
            placeholder="Summarize the main points in 2-3 sentences..."
          />
        </div>
      </div>
    );
  }

  if (styleType === "outline") {
    return (
      <div className="outline-mode-container">
        {/* Toolbar with outline-specific actions */}
        <div className="outline-toolbar mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>💡</span>
            <span>
              <strong>Shortcuts:</strong> Tab to indent • Shift+Tab to outdent • 
              Cmd+Shift+8 for bullets • Cmd+Shift+9 for tasks
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                editor?.isActive('bulletList')
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              • Bullets
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                editor?.isActive('orderedList')
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              1. Numbers
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                editor?.isActive('taskList')
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              ☐ Tasks
            </button>
            <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
              <span>{outlineMetadata?.totalItems || 0} items</span>
              {outlineMetadata && outlineMetadata.completedTasks > 0 && (
                <span>
                  {outlineMetadata.completedTasks} completed
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Editor */}
        <div className="outline-editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  // Default Standard
  return <EditorContent editor={editor} />;
}
