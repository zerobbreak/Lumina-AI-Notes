"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import "./editor.css"; // We will create this for basic styles

interface EditorProps {
  initialContent?: string;
  isEditable?: boolean;
  onChange?: (content: string) => void;
  placeholder?: string;
  styleType?: "standard" | "cornell" | "outline" | "mindmap";
}

export default function Editor({
  initialContent,
  isEditable = true,
  onChange,
  placeholder = "Start writing...",
  styleType = "standard",
}: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Effect to update content if it changes externally (e.g. switching notes)
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      // Only set if different to avoid cursor jumping, though simpler check might be needed
      // For now, if initialContent is empty string, we might want to clear.
      // Ideally usage: key={noteId} on parent to force re-mount
      if (initialContent) {
        editor.commands.setContent(initialContent);
      } else {
        editor.commands.clearContent();
      }
    }
  }, [initialContent, editor]);

  if (!editor) {
    return null;
  }

  // Render based on styleType
  if (styleType === "cornell") {
    return (
      <div className="grid grid-cols-[1fr_3fr] gap-4 h-full">
        <div className="border-r border-white/10 p-4 bg-white/5 min-h-[500px]">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">
            Cues / Questions
          </h3>
          {/* In a real implementation, this would be a separate editor instance or a specific node type */}
          <textarea
            className="w-full h-full bg-transparent resize-none focus:outline-none text-gray-400 text-sm"
            placeholder="Add cues..."
          />
        </div>
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-4">
            Notes
          </h3>
          <EditorContent editor={editor} />
        </div>
        <div className="col-span-2 border-t border-white/10 p-4 mt-4 bg-white/5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Summary
          </h3>
          <textarea
            className="w-full bg-transparent resize-none focus:outline-none text-gray-400 text-sm h-24"
            placeholder="Summarize the main points..."
          />
        </div>
      </div>
    );
  }

  if (styleType === "outline") {
    // Tiptap native lists are good for outlines
    return (
      <div className="pl-8">
        <EditorContent editor={editor} />
      </div>
    );
  }

  // Default Standard
  return <EditorContent editor={editor} />;
}
