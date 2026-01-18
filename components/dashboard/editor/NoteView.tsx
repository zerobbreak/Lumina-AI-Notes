"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Share2,
  FileText,
  Calendar,
  User,
  Bold,
  Italic,
  Strikethrough,
  List,
  Image as ImageIcon,
  Loader2,
  PanelLeft,
  PanelRight,
  Download,
  Clock,
  Type,
  Calculator,
  BarChart3,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { DiagramExtension } from "./extensions/DiagramExtension";
import Editor from "./Editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { EditableTitle } from "@/components/shared/EditableTitle";
import { AskAI } from "@/components/dashboard/ai/AskAI";
import { useDashboard } from "@/hooks/useDashboard";
import { usePDF } from "@/hooks/usePDF";
import { AIBubbleMenu } from "./AIBubbleMenu";
import { DocumentDropZone } from "@/components/documents";
import { marked } from "marked";
import {
  extractOutlineStructure,
  calculateOutlineMetadata,
  serializeOutline,
} from "@/lib/outlineUtils";
import { GenerateFlashcardsDialog } from "@/components/dashboard/dialogs/GenerateFlashcardsDialog";
import { GenerateQuizDialog } from "@/components/dashboard/dialogs/GenerateQuizDialog";
import { ExportDialog } from "@/components/dashboard/dialogs/ExportDialog";
import { ImageUploadDialog } from "@/components/dashboard/dialogs/ImageUploadDialog";
import { ImageExtension } from "./extensions/ImageExtension";
import { GraphCalculatorExtension } from "./extensions/GraphCalculatorExtension";
import { ChartExtension } from "./extensions/ChartExtension";
import { PresenceIndicator } from "@/components/dashboard/PresenceIndicator";
import "./editor.css";

// Heartbeat interval for presence tracking (30 seconds)
const PRESENCE_HEARTBEAT_INTERVAL = 30 * 1000;

// Props for the NoteView
interface NoteViewProps {
  noteId: Id<"notes">;
  onBack: () => void;
}

export default function NoteView({ noteId, onBack }: NoteViewProps) {
  const router = useRouter();
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    pendingNotes,
    clearPendingNotes,
  } = useDashboard();
  const { isLoading: isExporting } = usePDF();

  // Fetch data
  const note = useQuery(api.notes.getNote, { noteId });
  const userData = useQuery(api.users.getUser);
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const toggleArchiveNote = useMutation(api.notes.toggleArchiveNote);
  const renameNote = useMutation(api.notes.renameNote);
  const toggleShare = useMutation(api.notes.toggleShareNote);

  // Presence tracking
  const presenceHeartbeat = useMutation(api.presence.heartbeat);
  const presenceLeave = useMutation(api.presence.leave);

  // Editor State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [debouncedContent, setDebouncedContent] = useState<string | any>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);

  // Parse context (Course / Module)
  const courseName =
    userData?.courses?.find(
      (c: { id: string; name: string }) => c.id === note?.courseId
    )?.name || "General";

  // Calculate word count and reading time
  const noteContent = note?.content;
  const { wordCount, readingTime } = useMemo(() => {
    if (!noteContent) return { wordCount: 0, readingTime: "< 1 min" };

    // Strip HTML tags and count words
    const plainText = noteContent
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = plainText.split(/\s+/).filter((word) => word.length > 0);
    const count = words.length;

    // Average reading speed: 200-250 words per minute
    const minutes = Math.ceil(count / 225);
    const time = minutes < 1 ? "< 1 min" : `${minutes} min read`;

    return { wordCount: count, readingTime: time };
  }, [noteContent]);

  // Debounce Save Effect
  useEffect(() => {
    if (debouncedContent === null) return;

    const handler = setTimeout(() => {
      // Check if this is Cornell data (object with cornellCues, cornellNotes, cornellSummary)
      if (
        typeof debouncedContent === "object" &&
        "cornellCues" in debouncedContent
      ) {
        updateNote({
          noteId,
          cornellCues: debouncedContent.cornellCues,
          cornellNotes: debouncedContent.cornellNotes,
          cornellSummary: debouncedContent.cornellSummary,
        }).then(() => {
          setIsSaving(false);
        });
      } else if (
        note?.style === "outline" &&
        typeof debouncedContent === "string"
      ) {
        // Extract outline structure and metadata
        const structure = extractOutlineStructure(debouncedContent);
        const metadata = calculateOutlineMetadata(structure);
        const outlineData = serializeOutline(structure);

        updateNote({
          noteId,
          content: debouncedContent,
          outlineData,
          outlineMetadata: metadata,
        }).then(() => {
          setIsSaving(false);
        });
      } else {
        // Standard content save
        updateNote({ noteId, content: debouncedContent }).then(() => {
          setIsSaving(false);
        });
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [debouncedContent, noteId, updateNote, note?.style]);

  // Presence Heartbeat Effect - sends heartbeat on mount and every 30 seconds
  useEffect(() => {
    // Send initial heartbeat
    presenceHeartbeat({ noteId }).catch(console.error);

    // Set up interval for regular heartbeats
    const intervalId = setInterval(() => {
      presenceHeartbeat({ noteId }).catch(console.error);
    }, PRESENCE_HEARTBEAT_INTERVAL);

    // Cleanup: send leave signal and clear interval
    return () => {
      clearInterval(intervalId);
      presenceLeave({ noteId }).catch(console.error);
    };
  }, [noteId, presenceHeartbeat, presenceLeave]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: true,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your notes...",
      }),
      DiagramExtension,
      ImageExtension,
      GraphCalculatorExtension,
      ChartExtension,
    ],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[500px]",
      },
    },
    onUpdate: ({ editor }) => {
      setIsSaving(true);
      setDebouncedContent(editor.getHTML());
    },
  });

  // Track which note we've loaded content for to detect note changes
  const [loadedNoteId, setLoadedNoteId] = useState<Id<"notes"> | null>(null);
  // Use ref to track current noteId without causing dependency array issues
  const noteIdRef = useRef(noteId);
  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  // Helper function to detect if content is markdown and convert to HTML
  const convertMarkdownIfNeeded = async (content: string): Promise<string> => {
    if (!content) return "";

    // If content already has HTML block elements, it's already converted
    if (/<(h[1-6]|ul|ol|pre|blockquote|hr)[^>]*>/i.test(content)) {
      return content;
    }

    // Convert HTML to plain text while preserving line breaks
    const textContent = content
      .replace(/<\/p>|<\/div>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .trim();
    // Check for markdown patterns (headers, lists, code blocks, bold/italic)
    const markdownPatterns =
      /^#{1,6}\s|^[-*+]\s|^\d+\.\s|```|\*\*|__|\[.*\]\(.*\)/m;
    if (markdownPatterns.test(textContent)) {
      // Use textContent for conversion if original had HTML wrapper
      return await marked.parse(textContent);
    }
    return content;
  };

  // Sync content when note loads OR when noteId changes (switching between notes)
  useEffect(() => {
    const loadContent = async () => {
      if (note && editor && !editor.isDestroyed) {
        // Only load content if we haven't loaded for this noteId yet
        if (noteId !== loadedNoteId) {
          const htmlContent = await convertMarkdownIfNeeded(note.content || "");
          // Use queueMicrotask to schedule setContent outside of React's commit phase
          // This avoids the flushSync error since TipTap internally uses flushSync
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(htmlContent);
              setLoadedNoteId(noteId);
            }
          });
        }
      }
    };
    loadContent();
  }, [note, noteId, editor, loadedNoteId]); // Note: loadedNoteId prevents re-runs after initial load

  // Inject structured notes from RightSidebar when pendingNotes changes
  // Wait for note to be loaded (loadedNoteId === noteId) to avoid conflicts
  useEffect(() => {
    if (!pendingNotes) return;
    // Wait for the note content to be loaded first (important for new notes)
    if (loadedNoteId !== noteIdRef.current) return;

    // If this is a Cornell note, update the Cornell fields directly
    if (note?.style === "cornell") {
      const cornellCuesText = pendingNotes.cornellCues.join("\n\n");
      const cornellNotesHtml = pendingNotes.cornellNotes
        .map(
          (note, i) =>
            `<h4>${pendingNotes.cornellCues[i] || ""}</h4><p>${note}</p>`
        )
        .join("");
      const cornellSummaryText = pendingNotes.summary || "";

      // Update the note with Cornell data
      updateNote({
        noteId,
        cornellCues: cornellCuesText,
        cornellNotes: cornellNotesHtml,
        cornellSummary: cornellSummaryText,
      }).then(() => {
        clearPendingNotes();
      });
      return;
    }

    // For non-Cornell notes, build HTML content from structured notes
    if (!editor || editor.isDestroyed) return;

    let html = "";

    // Summary
    if (pendingNotes.summary) {
      html += `<h2>📝 Summary</h2>`;
      html += `<blockquote>${pendingNotes.summary}</blockquote>`;
    }

    // Cornell Notes
    if (pendingNotes.cornellCues.length > 0) {
      html += `<h2>📚 Cornell Notes</h2>`;
      pendingNotes.cornellCues.forEach((cue, i) => {
        const note = pendingNotes.cornellNotes[i] || "";
        html += `<h4>${cue}</h4>`;
        html += `<blockquote>${note}</blockquote>`;
        html += `<hr/>`;
      });
    }

    // Action Items
    if (pendingNotes.actionItems.length > 0) {
      html += `<h2>✅ Action Items</h2>`;
      html += `<ul>`;
      pendingNotes.actionItems.forEach((item) => {
        html += `<li>☐ ${item}</li>`;
      });
      html += `</ul>`;
    }

    // Review Questions
    if (pendingNotes.reviewQuestions.length > 0) {
      html += `<h2>❓ Review Questions</h2>`;
      html += `<ul>`;
      pendingNotes.reviewQuestions.forEach((q) => {
        html += `<li>${q}</li>`;
      });
      html += `</ul>`;
    }

    // Interactive Mind Map (ReactFlow)
    if (
      pendingNotes.diagramData &&
      pendingNotes.diagramData.nodes &&
      pendingNotes.diagramData.nodes.length > 0
    ) {
      // We inject the HTML that matches the DiagramExtension parseHTML rule
      html += `<h2>🗺️ Mind Map</h2>`;
      html += `<div data-type="diagram" data-nodes='${JSON.stringify(pendingNotes.diagramData.nodes)}' data-edges='${JSON.stringify(pendingNotes.diagramData.edges || [])}'></div>`;
    }

    // Insert at current cursor position (or end if no selection)
    // Use setTimeout to avoid flushSync error during React render
    // Delay ensures editor is fully initialized and React rendering cycle is complete
    const timeoutId = setTimeout(() => {
      if (editor && !editor.isDestroyed && editor.view) {
        try {
          editor.chain().focus().insertContent(html).run();
          clearPendingNotes();
        } catch (error) {
          console.error("Failed to insert pending notes:", error);
          clearPendingNotes();
        }
      }
    }, 200);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNotes, editor, clearPendingNotes, loadedNoteId]);

  // --- Handlers ---
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    setIsDeleting(true);

    // Store context before deletion for smart navigation
    const courseId = note?.courseId;
    const moduleId = note?.moduleId;

    try {
      await deleteNote({ noteId });

      // Navigate based on original context
      if (moduleId) {
        router.push(`/dashboard?contextId=${moduleId}&contextType=module`);
      } else if (courseId) {
        router.push(`/dashboard?contextId=${courseId}&contextType=course`);
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      console.error("Failed to delete note:", e);
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    await toggleArchiveNote({ noteId });
  };

  const handleRenameConfirm = async (newTitle: string) => {
    await renameNote({ noteId, title: newTitle });
  };

  const handleExportPDF = () => {
    setIsExportOpen(true);
  };

  // Handle inserting AI-generated content into the note
  const handleInsertFromAI = useCallback(
    (content: string) => {
      if (!editor || editor.isDestroyed) return;

      // Convert markdown to HTML for the editor
      // Simple conversion for common markdown patterns
      let htmlContent = content
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/^\- (.*$)/gim, "<li>$1</li>")
        .replace(/^\* (.*$)/gim, "<li>$1</li>")
        .replace(/\n/g, "<br>");

      // Wrap consecutive <li> elements in <ul>
      htmlContent = htmlContent.replace(/(<li>.*?<\/li>(<br>)?)+/g, (match) => {
        const items = match.replace(/<br>/g, "");
        return `<ul>${items}</ul>`;
      });

      // Insert at the end of the document with a separator
      editor
        .chain()
        .focus("end")
        .insertContent("<hr><p></p>")
        .insertContent(htmlContent)
        .insertContent("<p></p>")
        .run();
    },
    [editor]
  );

  // --- Deleting State ---
  if (isDeleting) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0A0A0A]/50 backdrop-blur-sm z-50">
        <div className="bg-[#111] border border-white/5 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
          <div className="p-3 bg-red-500/10 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-white font-medium mb-1">Deleting Note</h3>
            <p className="text-gray-500 text-sm">
              This action cannot be undone
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading State ---
  if (note === undefined || !userData) {
    return (
      <div className="h-full flex flex-col bg-[#0A0A0A]">
        {/* Skeleton Navigation */}
        <div className="h-16 flex items-center px-8 border-b border-white/5">
          <Skeleton className="h-4 w-24 mr-2" />
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-32 mr-2" />
          <Skeleton className="h-4 w-4 mr-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Skeleton Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-5xl mx-auto py-12 px-12">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="flex justify-between items-start gap-4">
                <Skeleton className="h-14 w-3/4 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10" />
                  <Skeleton className="h-10 w-10" />
                </div>
              </div>

              <div className="flex items-center gap-6 mt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            <Skeleton className="h-1px w-full mb-6" />

            {/* Editor Toolbar Skeleton */}
            <div className="mb-8 flex gap-2">
              <Skeleton className="h-10 w-80" />
            </div>

            {/* Content Skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-32 w-full mt-8" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[85%]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Note Not Found State ---
  if (note === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0A0A0A] text-gray-400 gap-4">
        <FileText className="w-12 h-12 text-gray-600" />
        <span className="text-lg">Note not found</span>
        <p className="text-sm text-gray-600">
          It may have been deleted or moved.
        </p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] relative animate-in fade-in duration-500">
      {/* 1. Top Navigation / Breadcrumbs */}
      <div className="h-16 flex items-center px-4 lg:px-8 border-b border-white/5 bg-black/20 backdrop-blur top-0 z-20 sticky justify-between">
        <div className="flex items-center gap-4">
          {/* Left Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLeftSidebar}
            className={`hidden md:flex ${!isLeftSidebarOpen ? "text-cyan-400 bg-cyan-500/10" : "text-gray-500"}`}
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </Button>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          <div className="flex items-center text-sm font-medium text-gray-500 gap-2">
            <span
              onClick={onBack}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Dashboard
            </span>
            <ChevronRight className="w-4 h-4 text-gray-700" />
            <span
              onClick={() => {
                // Navigate back to course/module context
                if (note.moduleId) {
                  router.push(
                    `/dashboard?contextId=${note.moduleId}&contextType=module`
                  );
                } else if (note.courseId) {
                  router.push(
                    `/dashboard?contextId=${note.courseId}&contextType=course`
                  );
                } else {
                  onBack();
                }
              }}
              className="hover:text-white cursor-pointer transition-colors"
            >
              {courseName}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-700" />
            <span className="text-cyan-400">
              {note.title.length > 20
                ? note.title.substring(0, 20) + "..."
                : note.title}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Presence Indicator - shows who else is viewing */}
          <PresenceIndicator noteId={noteId} className="hidden md:flex mr-2" />

          {/* Word count and reading time */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-gray-500 mr-3">
            <span className="flex items-center gap-1" title="Word count">
              <Type className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
            <span
              className="flex items-center gap-1"
              title="Estimated reading time"
            >
              <Clock className="w-3 h-3" />
              {readingTime}
            </span>
          </div>

          <span className="text-xs font-mono text-gray-600 uppercase tracking-widest hidden lg:block mr-2">
            {isSaving ? "Saving..." : "Saved"}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Export as PDF"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-gray-400 hover:text-white" />
            )}
          </Button>

          <ActionMenu
            onRename={() => setIsRenameOpen(true)}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onGenerateFlashcards={() => setIsFlashcardsOpen(true)}
            onGenerateQuiz={() => setIsQuizOpen(true)}
            isArchived={note.isArchived}
          />

          {/* Right Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebar}
            className={`hidden md:flex ${!isRightSidebarOpen ? "text-indigo-400 bg-indigo-500/10" : "text-gray-500"}`}
            title="Toggle Assistant"
          >
            <PanelRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 2. Main Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto py-12 px-12">
          {/* Header Section - Not included in PDF export */}
          <div className="mb-8" data-html2canvas-ignore>
            {/* Title & Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <EditableTitle
                  initialValue={note.title || ""}
                  onSave={handleRenameConfirm}
                  className="text-5xl font-bold text-white leading-tight tracking-tight px-0 -ml-0.5 hover:bg-transparent hover:text-gray-200 transition-colors cursor-text"
                  placeholder="Untitled Note"
                />
              </div>

              {/* Actions: Share */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant={note.isShared ? "default" : "ghost"}
                  size="sm"
                  onClick={async () => {
                    try {
                      const isSharedNow = await toggleShare({ noteId });
                      if (isSharedNow) {
                        const url = `${window.location.origin}/share/${noteId}`;
                        await navigator.clipboard.writeText(url);
                        alert("Public link copied to clipboard: " + url);
                      }
                    } catch (e) {
                      console.error("Failed to share", e);
                    }
                  }}
                  className={`${note.isShared ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {note.isShared ? "Shared" : "Share"}
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-6 mt-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(note.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{userData.name || "User"}</span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10 mb-6" data-html2canvas-ignore />

          {/* PDF Export Area - This is what gets exported */}
          <div id="note-content-area">
            {/* Toolbar */}
            {editor && (
              // Hide toolbar during export to clean up the PDF
              <div
                data-html2canvas-ignore
                className="flex items-center justify-between mb-6 sticky top-0 bg-[#0A0A0A] py-4 z-10 border-b border-transparent data-[stuck=true]:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
                  <ToolbarButton
                    isActive={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    icon={<Bold className="w-4 h-4" />}
                  />
                  <ToolbarButton
                    isActive={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    icon={<Italic className="w-4 h-4" />}
                  />
                  <ToolbarButton
                    isActive={editor.isActive("strike")}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    icon={<Strikethrough className="w-4 h-4" />}
                  />
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <ToolbarButton
                    isActive={editor.isActive("bulletList")}
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                    icon={<List className="w-4 h-4" />}
                  />
                  <ToolbarButton
                    isActive={false}
                    onClick={() => setIsImageUploadOpen(true)}
                    icon={<ImageIcon className="w-4 h-4" />}
                  />
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <ToolbarButton
                    isActive={false}
                    onClick={() => editor.chain().focus().insertGraphCalculator().run()}
                    icon={<Calculator className="w-4 h-4" />}
                  />
                  <ToolbarButton
                    isActive={false}
                    onClick={() => editor.chain().focus().insertChart().run()}
                    icon={<BarChart3 className="w-4 h-4" />}
                  />
                </div>
              </div>
            )}

            {/* Editor Content - Wrapped with DocumentDropZone for drag-drop note generation */}
            <DocumentDropZone
              onNotesGenerated={(content, title, sourceDoc) => {
                if (editor && !editor.isDestroyed) {
                  // Insert generated notes at cursor or end
                  const sourceTag = `<p><em>[Source: ${sourceDoc.name}]</em></p>`;
                  editor
                    .chain()
                    .focus()
                    .insertContent(content + sourceTag)
                    .run();
                }
              }}
              className="pb-32"
            >
              {note?.style === "cornell" ? (
                <Editor
                  styleType="cornell"
                  cornellCues={note.cornellCues || ""}
                  cornellNotes={note.cornellNotes || ""}
                  cornellSummary={note.cornellSummary || ""}
                  onChange={(content) => {
                    setIsSaving(true);
                    setDebouncedContent(content);
                  }}
                  isEditable={true}
                />
              ) : note?.style === "outline" ? (
                <Editor
                  styleType="outline"
                  initialContent={note.content || ""}
                  outlineData={note.outlineData}
                  outlineMetadata={note.outlineMetadata}
                  onChange={(content) => {
                    setIsSaving(true);
                    setDebouncedContent(content);
                  }}
                  isEditable={true}
                />
              ) : (
                <>
                  {editor && <AIBubbleMenu editor={editor} />}
                  <EditorContent editor={editor} />
                </>
              )}
            </DocumentDropZone>
          </div>
          {/* End PDF Export Area */}
        </div>
      </ScrollArea>

      {/* AI Assistant Bar */}
      <AskAI
        context={
          note.style === "cornell"
            ? `Cues: ${note.cornellCues || ""}\n\nNotes: ${note.cornellNotes || ""}\n\nSummary: ${note.cornellSummary || ""}`
            : note.content || ""
        }
        contextType="note"
        contextTitle={note.title}
        onInsertToNote={handleInsertFromAI}
      />

      <RenameDialog
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        initialValue={note.title}
        title="Note"
        onConfirm={handleRenameConfirm}
      />

      <GenerateFlashcardsDialog
        open={isFlashcardsOpen}
        onOpenChange={setIsFlashcardsOpen}
        defaultNoteId={noteId}
      />

      <GenerateQuizDialog
        open={isQuizOpen}
        onOpenChange={setIsQuizOpen}
        defaultNoteId={noteId}
      />

      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        elementId="note-content-area"
        filename={`${note.title || "note"}.pdf`}
        title={note.title}
      />

      <ImageUploadDialog
        open={isImageUploadOpen}
        onOpenChange={setIsImageUploadOpen}
        onImageUploaded={(url) => {
          // Use queueMicrotask to schedule the editor command outside of React's render cycle
          // This avoids the flushSync error since TipTap internally uses flushSync
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          });
        }}
        onFormulaExtracted={(latex) => {
          // Insert the LaTeX formula into the editor
          queueMicrotask(() => {
            if (editor && !editor.isDestroyed) {
              // Insert as a code block or formatted text
              editor.chain().focus().insertContent(`$$${latex}$$`).run();
            }
          });
        }}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  icon,
}: {
  onClick: () => void;
  isActive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-white/5"}`}
    >
      {icon}
    </button>
  );
}
