"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import "@/components/dashboard/editor/editor.css";

export default function PublicNotePage() {
  const params = useParams();
  const noteId = params.noteId as Id<"notes">;

  const note = useQuery(api.notes.getPublicNote, { noteId });

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[500px]",
      },
    },
  });

  useEffect(() => {
    if (note && editor && !editor.isDestroyed) {
      editor.commands.setContent(note.content || "");
    }
  }, [note, editor]);

  if (note === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-center p-4 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Lock className="w-8 h-8 text-gray-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Private or Missing Note
          </h1>
          <p className="text-gray-400 max-w-md">
            The note you are looking for does not exist or has not been made
            public.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-cyan-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full h-16 border-b border-white/5 bg-black/50 backdrop-blur-xl z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold tracking-tight">Lumina Notes</span>
        </div>
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          >
            Create Your Own
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Note Metadata */}
          <div className="space-y-6 text-center border-b border-white/5 pb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium uppercase tracking-widest">
              Public Note
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white/90">
              {note.title}
            </h1>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(note.createdAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Editor Read-Only */}
          <div className="prose prose-lg prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-p:text-gray-300 prose-strong:text-white prose-code:text-cyan-300">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-gray-600 text-sm">
        <p>Powered by Lumina Notes AI</p>
      </footer>
    </div>
  );
}
