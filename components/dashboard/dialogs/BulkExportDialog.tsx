"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  FileText,
  Folder,
  Loader2,
  CheckCircle,
  AlertCircle,
  Archive,
  FileDown,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

type ExportFormat = "markdown" | "html" | "json";

interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NoteForExport {
  _id: Id<"notes">;
  title: string;
  content?: string;
  courseId?: string;
  moduleId?: string;
  noteType?: string;
  style?: string;
  createdAt: number;
  isPinned?: boolean;
  isArchived?: boolean;
}

// Convert HTML content to Markdown
function htmlToMarkdown(html: string): string {
  if (!html) return "";

  return html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")
    // Bold and italic
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    // Strikethrough
    .replace(/<s[^>]*>(.*?)<\/s>/gi, "~~$1~~")
    .replace(/<strike[^>]*>(.*?)<\/strike>/gi, "~~$1~~")
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)")
    // Lists
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br[^>]*\/?>/gi, "\n")
    // Code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n\n")
    // Blockquotes
    .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, (match) => {
      const content = match.replace(/<blockquote[^>]*>/, "").replace(/<\/blockquote>/, "");
      return `> ${content}\n\n`;
    })
    // Horizontal rules
    .replace(/<hr[^>]*\/?>/gi, "\n---\n\n")
    // Clean up remaining tags
    .replace(/<[^>]+>/g, "")
    // Clean up entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Generate filename safe string
function safeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

export function BulkExportDialog({ open, onOpenChange }: BulkExportDialogProps) {
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [status, setStatus] = useState<"idle" | "exporting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const notes = useQuery(api.notes.getAllNotesForExport, { includeArchived });
  const userData = useQuery(api.users.getUser);

  // Group notes by course
  const groupedNotes = useMemo(() => {
    if (!notes) return {};

    const groups: Record<string, NoteForExport[]> = {
      "Quick Notes": [],
    };

    for (const note of notes) {
      if (note.courseId) {
        const courseName =
          userData?.courses?.find((c: { id: string; name: string }) => c.id === note.courseId)?.name ||
          note.courseId;
        if (!groups[courseName]) {
          groups[courseName] = [];
        }
        groups[courseName].push(note as NoteForExport);
      } else {
        groups["Quick Notes"].push(note as NoteForExport);
      }
    }

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, notes]) => notes.length > 0));
  }, [notes, userData]);

  const handleSelectAll = () => {
    if (!notes) return;
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes.map((n) => n._id)));
    }
  };

  const handleSelectGroup = (groupNotes: NoteForExport[]) => {
    const groupIds = new Set(groupNotes.map((n) => n._id));
    const allSelected = groupNotes.every((n) => selectedNotes.has(n._id));

    if (allSelected) {
      // Deselect all in group
      setSelectedNotes((prev) => {
        const next = new Set(prev);
        groupIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all in group
      setSelectedNotes((prev) => new Set([...prev, ...groupIds]));
    }
  };

  const handleToggleNote = (noteId: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (!notes || selectedNotes.size === 0) return;

    setStatus("exporting");
    setError(null);
    setProgress(0);

    try {
      const selectedNotesList = notes.filter((n) => selectedNotes.has(n._id));
      const zip = new JSZip();
      const total = selectedNotesList.length;

      for (let i = 0; i < selectedNotesList.length; i++) {
        const note = selectedNotesList[i];
        let content = "";
        let extension = "";

        switch (exportFormat) {
          case "markdown":
            content = `# ${note.title}\n\n${htmlToMarkdown(note.content || "")}`;
            extension = ".md";
            break;
          case "html":
            content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  ${note.content || ""}
</body>
</html>`;
            extension = ".html";
            break;
          case "json":
            content = JSON.stringify(
              {
                title: note.title,
                content: note.content,
                createdAt: new Date(note.createdAt).toISOString(),
                courseId: note.courseId,
                moduleId: note.moduleId,
                style: note.style,
                noteType: note.noteType,
              },
              null,
              2
            );
            extension = ".json";
            break;
        }

        const filename = `${safeFilename(note.title)}${extension}`;

        // Organize by course folder
        if (note.courseId) {
          const courseName =
            userData?.courses?.find((c: { id: string; name: string }) => c.id === note.courseId)?.name ||
            "Course";
          zip.file(`${safeFilename(courseName)}/${filename}`, content);
        } else {
          zip.file(`Quick Notes/${filename}`, content);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // Generate and download zip
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-notes-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("success");

      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
        setSelectedNotes(new Set());
      }, 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleClose = () => {
    if (status !== "exporting") {
      onOpenChange(false);
      setStatus("idle");
      setError(null);
      setSelectedNotes(new Set());
    }
  };

  const formatOptions: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { value: "markdown", label: "Markdown", icon: <FileText className="w-4 h-4" /> },
    { value: "html", label: "HTML", icon: <FileDown className="w-4 h-4" /> },
    { value: "json", label: "JSON", icon: <FileJson className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-white/10 text-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Archive className="w-5 h-5 text-cyan-400" />
            </div>
            Bulk Export Notes
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Select notes to export as a ZIP archive
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Format Selection */}
          <div className="flex gap-2">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setExportFormat(option.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  exportFormat === option.value
                    ? "bg-cyan-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs border-white/10"
              >
                {notes && selectedNotes.size === notes.length ? "Deselect All" : "Select All"}
              </Button>
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <Checkbox
                  checked={includeArchived}
                  onCheckedChange={(checked) => setIncludeArchived(checked as boolean)}
                  className="border-white/20"
                />
                Include archived
              </label>
            </div>
            <span className="text-xs text-gray-500">
              {selectedNotes.size} of {notes?.length || 0} selected
            </span>
          </div>

          {/* Notes List */}
          <ScrollArea className="flex-1 border border-white/10 rounded-lg">
            <div className="p-2 space-y-3">
              {!notes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                </div>
              ) : Object.keys(groupedNotes).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No notes to export</div>
              ) : (
                Object.entries(groupedNotes).map(([groupName, groupNotes]) => (
                  <div key={groupName} className="space-y-1">
                    {/* Group Header */}
                    <button
                      onClick={() => handleSelectGroup(groupNotes)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                    >
                      <Folder className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-gray-300 flex-1 text-left">
                        {groupName}
                      </span>
                      <span className="text-xs text-gray-500">{groupNotes.length} notes</span>
                      <Checkbox
                        checked={groupNotes.every((n) => selectedNotes.has(n._id))}
                        className="border-white/20"
                      />
                    </button>

                    {/* Notes in Group */}
                    <div className="ml-6 space-y-0.5">
                      {groupNotes.map((note) => (
                        <button
                          key={note._id}
                          onClick={() => handleToggleNote(note._id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                            selectedNotes.has(note._id)
                              ? "bg-cyan-500/10 text-cyan-400"
                              : "hover:bg-white/5 text-gray-400"
                          )}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-xs flex-1 text-left truncate">{note.title}</span>
                          {note.isPinned && <span className="text-[10px]">📌</span>}
                          <Checkbox
                            checked={selectedNotes.has(note._id)}
                            className="border-white/20"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Progress */}
          {status === "exporting" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Exporting...</span>
                <span className="text-cyan-400">{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400">Export complete!</span>
            </div>
          )}

          {/* Error State */}
          {status === "error" && error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <div className="text-red-400 font-medium">Export failed</div>
                <div className="text-red-400/70 text-sm mt-1">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={status === "exporting"}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={status === "exporting" || status === "success" || selectedNotes.size === 0}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {status === "exporting" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {selectedNotes.size} {selectedNotes.size === 1 ? "Note" : "Notes"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
