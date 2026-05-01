"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { NoteBootstrap } from "@/components/dashboard/DashboardContext";
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
  Download,
  Clock,
  Type,
  Calculator,
  BarChart3,
  Sigma,
  Pin,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEditor,
  EditorContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { editorLowlight } from "@/lib/editorLowlight";
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
import { CodeBlockLanguageBubbleMenu } from "./CodeBlockLanguageBubbleMenu";
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
import { MathExtensions } from "./extensions/MathExtension";
import { SlashCommand, renderItems } from "./extensions/SlashCommand";
import { SlashCommandLayer } from "./SlashCommandLayer";
import { PresenceIndicator } from "@/components/dashboard/PresenceIndicator";
import { CollaboratorsDialog } from "@/components/dashboard/dialogs/CollaboratorsDialog";
import { TagPicker } from "@/components/dashboard/tags/TagPicker";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";

import { toast } from "sonner";
import "./editor.css";

// Heartbeat interval for presence tracking (120 seconds - reduced for DB usage)
const PRESENCE_HEARTBEAT_INTERVAL = 120 * 1000;

function buildBootstrapDoc(
  noteId: Id<"notes">,
  b: NoteBootstrap,
  userId: string,
): Doc<"notes"> {
  return {
    _id: noteId,
    _creationTime: Date.now(),
    userId,
    title: b.title,
    content: "",
    style: b.style ?? "standard",
    courseId: b.courseId,
    moduleId: b.moduleId,
    parentNoteId: b.parentNoteId,
    createdAt: Date.now(),
    noteType: b.parentNoteId || b.courseId || b.moduleId ? "page" : "quick",
  } as Doc<"notes">;
}

// Props for the NoteView
interface NoteViewProps {
  noteId: Id<"notes">;
  onBack: () => void;
}

export default function NoteView({ noteId, onBack }: NoteViewProps) {
  const router = useRouter();
  const {
    pendingNotes,
    pendingNotesTargetNoteId,
    clearPendingNotes,
    noteBootstrap,
    setNoteBootstrap,
  } = useDashboard();
  const { isLoading: isExporting } = usePDF();

  // Fetch data
  const noteQuery = useQuery(api.notes.getNote, { noteId });
  const parentNote = useQuery(
    api.notes.getNote,
    noteQuery?.parentNoteId ? { noteId: noteQuery.parentNoteId } : "skip",
  );
  const childNotes = useQuery(api.notes.getChildNotes, { parentNoteId: noteId });
  const userData = useQuery(api.users.getUser);
  const { createNoteFlow } = useCreateNoteFlow();
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const toggleArchiveNote = useMutation(api.notes.toggleArchiveNote);
  const renameNote = useMutation(api.notes.renameNote);
  const toggleShare = useMutation(api.notes.toggleShareNote);
  const togglePinNote = useMutation(api.notes.togglePinNote);

  // Presence tracking
  const presenceHeartbeat = useMutation(api.presence.heartbeat);
  const presenceLeave = useMutation(api.presence.leave);

  // Editor State
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [debouncedContent, setDebouncedContent] = useState<string | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);

  const [slashUiTick, setSlashUiTick] = useState(0);
  const bumpSlashUi = useCallback(() => {
    setSlashUiTick((n) => n + 1);
  }, []);

  const syntheticNote = useMemo((): Doc<"notes"> | null => {
    if (!userData || noteBootstrap?.noteId !== noteId) return null;
    return buildBootstrapDoc(noteId, noteBootstrap, userData.tokenIdentifier);
  }, [noteId, noteBootstrap, userData]);

  const displayNote = useMemo((): Doc<"notes"> | null | undefined => {
    if (noteQuery === null) return null;
    if (noteQuery !== undefined) return noteQuery;
    return syntheticNote ?? undefined;
  }, [noteQuery, syntheticNote]);

  // Deleted note or lost access: leave editor (presence leave would fail without server fix too).
  useEffect(() => {
    if (userData === undefined || userData === null) return;
    if (noteQuery === undefined) return;
    if (noteQuery !== null) return;
    if (syntheticNote) return;
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      onBack();
    }
  }, [userData, noteQuery, syntheticNote, router, onBack]);

  // Parse context (Course / Module)
  const courseName = useMemo(() => {
    if (!userData?.courses) return "General";
    const cid = displayNote?.courseId;
    const mid = displayNote?.moduleId;
    if (cid) {
      return (
        userData.courses.find((c: { id: string; name: string }) => c.id === cid)
          ?.name || "General"
      );
    }
    if (mid) {
      for (const c of userData.courses) {
        if (c.modules?.some((m: { id: string }) => m.id === mid)) {
          return c.name;
        }
      }
    }
    return "General";
  }, [userData?.courses, displayNote?.courseId, displayNote?.moduleId]);

  // Calculate word count and reading time
  const noteContent = displayNote?.content;
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

  useEffect(() => {
    if (noteBootstrap && noteBootstrap.noteId !== noteId) {
      setNoteBootstrap(null);
    }
  }, [noteId, noteBootstrap, setNoteBootstrap]);

  useEffect(() => {
    if (noteQuery && noteBootstrap?.noteId === noteId) {
      setNoteBootstrap(null);
    }
  }, [noteQuery, noteId, noteBootstrap, setNoteBootstrap]);

  // Debounce Save Effect
  useEffect(() => {
    if (debouncedContent === null) return;
    if (noteQuery === null) return;
    if (noteQuery === undefined && noteBootstrap?.noteId !== noteId) return;

    const handler = setTimeout(() => {
      if (displayNote?.style === "outline") {
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
        // Calculate word count for stats
        const contentStr =
          typeof debouncedContent === "string" ? debouncedContent : "";
        const plainText = contentStr
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const count =
          plainText.length > 0
            ? plainText.split(/\s+/).filter((word) => word.length > 0).length
            : 0;

        updateNote({
          noteId,
          content: debouncedContent,
          wordCount: count,
        }).then(() => {
          setIsSaving(false);
        });
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [
    debouncedContent,
    noteQuery,
    noteId,
    noteBootstrap?.noteId,
    updateNote,
    displayNote?.style,
  ]);

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
    editable: true,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({
        lowlight: editorLowlight,
        defaultLanguage: "javascript",
        HTMLAttributes: {
          class: "lumina-code-block",
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your notes...",
      }),
      SlashCommand.configure({
        suggestion: {
          render: () => renderItems(bumpSlashUi),
        },
      }),
      DiagramExtension,
      ImageExtension,
      GraphCalculatorExtension,
      ChartExtension,
      ...MathExtensions, // Math formula support (inline $...$ and block $$...$$)
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

  useEffect(() => {
    setLoadedNoteId(null);
  }, [noteId]);

  const scheduleEditorUpdate = useCallback((fn: () => void) => {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(fn);
      });
    });
  }, []);

  /** Recording flow: user chose Insert Notes and we are opening the note / injecting AI content */
  const isAwaitingRecordingNotes = Boolean(
    pendingNotes && pendingNotesTargetNoteId === noteId,
  );
  const recordingNotesOverlayLabel =
    loadedNoteId === noteId ? "Adding your notes…" : "Opening your note…";

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

  /** Convert AI/transcript markdown to HTML for TipTap insertContent (same as DocumentDropZone). */
  const markdownToHtml = useCallback(async (md: string): Promise<string> => {
    const trimmed = md.trim();
    if (!trimmed) return "";
    const result = await marked.parse(trimmed);
    return typeof result === "string" ? result : String(result);
  }, []);

  // Sync content when note loads OR when noteId changes (switching between notes)
  useEffect(() => {
    const loadContent = async () => {
      if (noteQuery && editor && !editor.isDestroyed) {
        // Only load content if we haven't loaded for this noteId yet
        if (noteId !== loadedNoteId) {
          const htmlContent = await convertMarkdownIfNeeded(
            noteQuery.content || "",
          );
          const raw = noteQuery.content || "";
          const serverEmpty =
            !raw.trim() ||
            raw === "<p></p>" ||
            raw === "<p><br></p>";
          scheduleEditorUpdate(() => {
            if (editor && !editor.isDestroyed) {
              if (serverEmpty && editor.getText().trim().length > 0) {
                const html = editor.getHTML();
                const plainText = html
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                const count =
                  plainText.length > 0
                    ? plainText.split(/\s+/).filter((w) => w.length > 0).length
                    : 0;
                setLoadedNoteId(noteId);
                updateNote({ noteId, content: html, wordCount: count }).catch(
                  () => {},
                );
                return;
              }
              editor.commands.setContent(htmlContent);
              setLoadedNoteId(noteId);
            }
          });
        }
      }
    };
    loadContent();
  }, [
    noteQuery,
    noteId,
    editor,
    loadedNoteId,
    scheduleEditorUpdate,
    updateNote,
  ]);

  // Inject structured notes from RightSidebar when pendingNotes changes
  // Wait for note to be loaded (loadedNoteId === noteId) to avoid conflicts
  useEffect(() => {
    if (!pendingNotes) return;
    if (pendingNotesTargetNoteId !== noteId) return;
    // Wait for the note content to be loaded first (important for new notes)
    if (loadedNoteId !== noteIdRef.current) return;

    // Build HTML content from structured notes with sections
    if (!editor || editor.isDestroyed) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      let html = "";

      // Summary: backend streaming returns markdown; must parse to HTML — raw markdown
      // inside <blockquote> was shown as literal # and ** (TipTap does not parse MD in HTML text nodes).
      if (pendingNotes.summary) {
        html += `<h2>Summary</h2>`;
        html += await markdownToHtml(pendingNotes.summary);
      }

      // Sections (Notion-like format)
      if (pendingNotes.sections && pendingNotes.sections.length > 0) {
        for (const section of pendingNotes.sections) {
          switch (section.type) {
            case "heading": {
              const level = section.level || 2;
              html += `<h${level}>${section.content}</h${level}>`;
              break;
            }
            case "paragraph":
              html += `<p>${section.content}</p>`;
              break;
            case "bullets":
              html += `<ul>`;
              section.content.split("\n").forEach((item) => {
                const cleaned = item.replace(/^[•\u2022\-–]\s*/, "").trim();
                if (cleaned) html += `<li>${cleaned}</li>`;
              });
              html += `</ul>`;
              break;
            case "numbered":
              html += `<ol>`;
              section.content.split("\n").forEach((item) => {
                const cleaned = item.replace(/^\d+\.\s*/, "").trim();
                if (cleaned) html += `<li>${cleaned}</li>`;
              });
              html += `</ol>`;
              break;
            case "quote":
              html += await markdownToHtml(section.content);
              break;
            case "divider":
              html += `<hr/>`;
              break;
            default:
              html += `<p>${section.content}</p>`;
          }
        }
      }

      // Action Items
      if (pendingNotes.actionItems.length > 0) {
        html += `<h2>Action Items</h2>`;
        html += `<ul>`;
        pendingNotes.actionItems.forEach((item) => {
          html += `<li>${item}</li>`;
        });
        html += `</ul>`;
      }

      // Review Questions
      if (pendingNotes.reviewQuestions.length > 0) {
        html += `<h2>Review Questions</h2>`;
        html += `<ul>`;
        pendingNotes.reviewQuestions.forEach((q) => {
          const cleaned = q.replace(/^[•\u2022\-–]\s+/, "");
          html += `<li>${cleaned}</li>`;
        });
        html += `</ul>`;
      }

      // Interactive Mind Map (ReactFlow)
      if (
        pendingNotes.diagramData &&
        pendingNotes.diagramData.nodes &&
        pendingNotes.diagramData.nodes.length > 0
      ) {
        html += `<h2>Mind Map</h2>`;
        html += `<div data-type="diagram" data-nodes='${JSON.stringify(pendingNotes.diagramData.nodes)}' data-edges='${JSON.stringify(pendingNotes.diagramData.edges || [])}'></div>`;
      }

      if (cancelled) return;

      timeoutId = setTimeout(() => {
        scheduleEditorUpdate(() => {
          if (editor && !editor.isDestroyed && editor.view) {
            try {
              editor.chain().focus().insertContent(html).run();
              clearPendingNotes();
            } catch (error) {
              console.error("Failed to insert pending notes:", error);
              clearPendingNotes();
            }
          }
        });
      }, 200);
    };

    void run();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [
    pendingNotes,
    pendingNotesTargetNoteId,
    noteId,
    editor,
    clearPendingNotes,
    loadedNoteId,
    scheduleEditorUpdate,
    markdownToHtml,
  ]);

  // --- Handlers ---
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    setIsDeleting(true);

    // Store context before deletion for smart navigation
    const courseId = displayNote?.courseId;
    const moduleId = displayNote?.moduleId;
    const parentId = displayNote?.parentNoteId;

    try {
      await deleteNote({ noteId });

      if (parentId) {
        router.push(`/dashboard?noteId=${parentId}`);
      } else if (moduleId) {
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

  const handleCreateSubPage = useCallback(async () => {
    if (!displayNote) return;
    try {
      const result = await createNoteFlow({
        title: "Untitled Note",
        major: userData?.major || "general",
        parentNoteId: noteId,
        courseId: displayNote.courseId,
        moduleId: displayNote.moduleId,
        noteType: "page",
      });
      if (result?.noteId) {
        router.push(`/dashboard?noteId=${result.noteId}`);
        toast.success("Sub-page created");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create sub-page");
    }
  }, [
    createNoteFlow,
    userData?.major,
    noteId,
    displayNote,
    router,
  ]);

  const handleExportPDF = () => {
    setIsExportOpen(true);
  };



  // Handle inserting AI-generated content into the note (full markdown: fenced code blocks, lists, etc.)
  const handleInsertFromAI = useCallback(
    (content: string) => {
      if (!editor || editor.isDestroyed) return;

      void (async () => {
        const htmlContent = await markdownToHtml(content);
        if (!editor || editor.isDestroyed) return;
        editor
          .chain()
          .focus("end")
          .insertContent("<hr><p></p>")
          .insertContent(htmlContent)
          .insertContent("<p></p>")
          .run();
      })();
    },
    [editor, markdownToHtml],
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

  if (!userData || displayNote === undefined) {
    return (
      <div className="h-full flex flex-col bg-[#0A0A0A] relative">
        {isAwaitingRecordingNotes && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0A0A0A]/85 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              {recordingNotesOverlayLabel}
            </p>
          </div>
        )}
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

  if (displayNote === null) {
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

  const note = displayNote;

  return (
    <div className="h-full flex flex-col bg-background relative animate-in fade-in duration-500">
      {isAwaitingRecordingNotes && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            {recordingNotesOverlayLabel}
          </p>
        </div>
      )}
      {/* 1. Top Navigation / Breadcrumbs */}
      <div className="h-16 flex items-center px-4 lg:px-8 bg-background top-0 z-20 sticky justify-between">
        <div className="flex items-center gap-4">
          {/* Left sidebar: single collapse control lives in Sidebar.tsx header (avoids duplicate with main chrome) */}
          <div className="flex items-center text-sm font-medium text-muted-foreground gap-2">
            <span
              onClick={onBack}
              className="hover:text-foreground cursor-pointer transition-colors"
            >
              Dashboard
            </span>
            <ChevronRight className="w-4 h-4 text-zinc-700" />
            <span
              onClick={() => {
                // Navigate back to course/module context
                if (note.moduleId) {
                  router.push(
                    `/dashboard?contextId=${note.moduleId}&contextType=module`,
                  );
                } else if (note.courseId) {
                  router.push(
                    `/dashboard?contextId=${note.courseId}&contextType=course`,
                  );
                } else {
                  onBack();
                }
              }}
              className="hover:text-foreground cursor-pointer transition-colors"
            >
              {courseName}
            </span>
            {parentNote && (
              <>
                <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
                <span
                  onClick={() =>
                    router.push(`/dashboard?noteId=${parentNote._id}`)
                  }
                  className="hover:text-foreground cursor-pointer transition-colors truncate max-w-[min(40vw,200px)]"
                  title={parentNote.title}
                >
                  {parentNote.title.length > 24
                    ? `${parentNote.title.slice(0, 24)}…`
                    : parentNote.title}
                </span>
              </>
            )}
            <ChevronRight className="w-4 h-4 text-zinc-700" />
            <span className="text-foreground">
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
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground mr-3">
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

          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest hidden lg:block mr-2">
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
              <Download className="w-5 h-5 text-muted-foreground hover:text-foreground" />
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

        </div>
      </div>

      {/* 2. Main Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-8 lg:px-16">
          {/* Header Section - Not included in PDF export */}
          <div className="mb-5 sm:mb-6" data-html2canvas-ignore>
            {/* Title & Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <EditableTitle
                  initialValue={note.title || ""}
                  onSave={handleRenameConfirm}
                  className="text-4xl font-bold text-foreground leading-tight px-0 -ml-0.5 hover:bg-transparent hover:text-foreground transition-colors cursor-text"
                  placeholder="Untitled Note"
                />
              </div>

              {/* Actions: Share */}
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollaboratorsOpen(true)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <User className="w-4 h-4 mr-2" />
                  Collaborate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await togglePinNote({ noteId });
                  }}
                  className={`${note.isPinned ? "text-foreground bg-accent hover:bg-accent/80" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                  title={note.isPinned ? "Unpin note" : "Pin note"}
                >
                  <Pin
                    className={`w-4 h-4 mr-2 ${note.isPinned ? "fill-current" : ""}`}
                  />
                  {note.isPinned ? "Pinned" : "Pin"}
                </Button>
                <Button
                  variant={note.isShared ? "secondary" : "ghost"}
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
                  className={`${note.isShared ? "bg-accent text-foreground border border-border hover:bg-accent/80" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {note.isShared ? "Shared" : "Share"}
                </Button>

                {/* Tag Picker */}
                <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
                <TagPicker
                  selectedTagIds={note.tagIds || []}
                  onTagToggle={async (tagId) => {
                    const currentTags = note.tagIds || [];
                    const newTags = currentTags.includes(tagId)
                      ? currentTags.filter((t) => t !== tagId)
                      : [...currentTags, tagId];
                    await updateNote({ noteId, tagIds: newTags });
                  }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sub-pages
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreateSubPage}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New sub-page
                </Button>
              </div>
              {childNotes && childNotes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {childNotes.map((c) => (
                    <li key={c._id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard?noteId=${c._id}`)
                        }
                        className="text-left text-sm text-primary hover:underline w-full truncate"
                      >
                        {c.title || "Untitled"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-sm text-muted-foreground">
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

          <Separator className="bg-border mb-4 sm:mb-5" data-html2canvas-ignore />

          {/* PDF Export Area - This is what gets exported */}
          <div id="note-content-area">
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
              {note?.style === "outline" ? (
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
                  {editor && <CodeBlockLanguageBubbleMenu editor={editor} />}
                  {editor && <AIBubbleMenu editor={editor} />}
                  <div className="relative" data-slash-ui={slashUiTick}>
                    {editor && <SlashCommandLayer editor={editor} />}
                    <EditorContent editor={editor} />
                  </div>
                </>
              )}
            </DocumentDropZone>
          </div>
          {/* End PDF Export Area */}
        </div>
      </ScrollArea>

      {/* AI Assistant Bar */}
      <AskAI
        context={note.content || ""}
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

      {/* Listen for custom event to open image upload */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('open-image-upload', () => {
              // This is a bit of a hack to trigger the state change from outside React
              // In a real app, we'd use a more robust state management solution
              const btn = document.querySelector('[data-image-upload-trigger]');
              if (btn) btn.click();
            });
          `,
        }}
      />
      <button
        data-image-upload-trigger
        className="hidden"
        onClick={() => setIsImageUploadOpen(true)}
      />

      <CollaboratorsDialog
        open={isCollaboratorsOpen}
        onOpenChange={setIsCollaboratorsOpen}
        noteId={noteId}
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
