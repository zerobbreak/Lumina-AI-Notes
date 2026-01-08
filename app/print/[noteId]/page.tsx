"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlock from "@tiptap/extension-code-block";
import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import "@/components/dashboard/editor/editor.css";
import "./print.css";

/**
 * Print-optimized page for PDF export via Puppeteer
 * This page renders note content without UI chrome (sidebar, header, etc.)
 * Used by the headless browser to generate clean PDFs
 */
export default function PrintNotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const noteId = params.noteId as Id<"notes">;
  const token = searchParams.get("token");

  // TODO: Validate export token for security
  // For now, we use the public note query which checks isShared
  // In production, implement token validation
  const note = useQuery(api.notes.getPublicNote, { noteId });

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlock,
    ],
    editorProps: {
      attributes: {
        class: "prose prose-print max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (note && editor && !editor.isDestroyed) {
      editor.commands.setContent(note.content || "");
    }
  }, [note, editor]);

  // Loading state
  if (note === undefined) {
    return (
      <div className="print-loading">
        <p>Loading content...</p>
      </div>
    );
  }

  // Note not found or not shared
  if (note === null) {
    return (
      <div className="print-error">
        <h1>Note Not Available</h1>
        <p>This note does not exist or is not available for export.</p>
      </div>
    );
  }

  return (
    <div className="print-container">
      {/* Title */}
      <header className="print-header">
        <h1 className="print-title">{note.title}</h1>
        <div className="print-meta">
          <span>
            {new Date(note.createdAt).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </span>
        </div>
      </header>

      {/* Divider */}
      <hr className="print-divider" />

      {/* Content */}
      <main className="print-content">
        <EditorContent editor={editor} />
      </main>

      {/* Footer */}
      <footer className="print-footer">
        <p>Exported from Lumina Notes</p>
      </footer>
    </div>
  );
}
