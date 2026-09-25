"use client";

import { useFolderViewData } from "@/lib/hooks/folder/useFolderViewData";
import { useCourseActions } from "@/lib/hooks/mutations/useCourseActions";
import { useFileActions } from "@/lib/hooks/mutations/useFileActions";
import { useNoteActions } from "@/lib/hooks/mutations/useNoteActions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, BookOpen, Plus, File, Upload } from "lucide-react";
import { Id } from "@/types/data-model";
import { Course } from "@/types";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { EditableTitle } from "@/components/shared/EditableTitle";
import { DraggableDocument, DocumentStatusBadge } from "@/components/documents";
import { useState } from "react";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import { NoteCard } from "@/components/dashboard/home/NoteCard";
import { CourseOverview } from "@/components/dashboard/course/CourseOverview";
import { Eyebrow, HomeCard } from "@/components/dashboard/home/parts";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";

interface FolderViewProps {
  contextId: string;
  contextType: "course" | "module" | string;
}

import { motion } from "framer-motion";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function FolderView({
  contextId,
  contextType,
}: FolderViewProps) {
  const router = useRouter();
  const { userData, contextNotes, contextFiles, courseId } = useFolderViewData(
    contextId,
    contextType,
  );

  const { createNoteFlow } = useCreateNoteFlow();
  const { renameCourse } = useCourseActions();
  const { deleteFile, renameFile, retryProcessing } = useFileActions();
  const { togglePinNote, deleteNote, renameNote } = useNoteActions();

  const [renameTarget, setRenameTarget] = useState<{
    id: string | Id<"files"> | Id<"notes">;
    title: string;
    type: "file" | "note";
  } | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // --- Helpers ---
  const currentCourse = courseId
    ? userData?.courses?.find((c: Course) => c.id === courseId)
    : undefined;
  const contextName = currentCourse?.name ?? (courseId ? "Module" : "Smart Folder");

  /** "3 notes in this module", "1 file here", "No notes yet". */
  const countHeading = (count: number | undefined, noun: string, where: string) => {
    if (count === undefined) return `${noun[0]!.toUpperCase()}${noun.slice(1)}s`;
    if (count === 0) return `No ${noun}s yet`;
    return `${count} ${noun}${count === 1 ? "" : "s"} ${where}`;
  };

  // --- Handlers ---
  const handleCreateNoteInContext = async () => {
    try {
      const result = await createNoteFlow({
        title: "Untitled Note",
        major: userData?.major || "general",
        courseId,
      });
      if (result?.noteId) {
        router.push(`/dashboard?noteId=${result.noteId}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameConfirm = async (newTitle: string) => {
    if (!renameTarget) return;
    if (renameTarget.type === "file") {
      await renameFile({
        fileId: renameTarget.id as Id<"files">,
        name: newTitle,
      });
    } else if (renameTarget.type === "note") {
      await renameNote({
        noteId: renameTarget.id as Id<"notes">,
        title: newTitle,
      });
    }
    setRenameTarget(null);
  };

  return (
    <div className="h-full flex flex-col relative bg-sidebar text-sidebar-foreground">
      {/* Header — flat chrome to match left/right sidebars (bg-sidebar) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-64 flex flex-col justify-end px-12 pb-10 border-b border-sidebar-border overflow-hidden bg-sidebar"
      >
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-3 text-sm text-muted-foreground mb-6"
          >
            <span
              className="hover:text-sidebar-primary cursor-pointer transition-colors"
              onClick={() => router.push("/dashboard?view=home")}
            >
              Smart Folders
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
            <span className="font-medium text-sidebar-foreground bg-sidebar-accent px-3 py-1 rounded-full border border-sidebar-border">
              {contextName}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center shadow-sm">
                <BookOpen className="w-8 h-8 text-sidebar-primary" />
              </div>
              {currentCourse ? (
                <div>
                  <EditableTitle
                    initialValue={currentCourse.name}
                    onSave={async (name) => {
                      await renameCourse({ courseId: currentCourse.id, name });
                    }}
                    className="text-3xl md:text-4xl font-bold text-sidebar-foreground tracking-tight hover:bg-sidebar-accent/50 rounded px-2 -ml-2 transition-colors cursor-text"
                    placeholder="Untitled module"
                  />
                  {currentCourse.code && (
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{currentCourse.code}</p>
                  )}
                </div>
              ) : (
                <h1 className="text-3xl md:text-4xl font-bold text-sidebar-foreground tracking-tight line-clamp-2 leading-tight max-w-4xl">
                  {contextName}
                </h1>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {courseId && (
                <Button variant="outline" className="h-10 rounded-lg px-4" onClick={() => setIsUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" aria-hidden />
                  Upload
                </Button>
              )}
              <Button className="h-10 rounded-lg px-4" onClick={handleCreateNoteInContext}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                New note
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <ScrollArea className="flex-1 bg-sidebar">
        <div className="max-w-[1600px] mx-auto py-12 px-12 space-y-12">
          {currentCourse && <CourseOverview course={currentCourse} />}

          <section aria-labelledby="folder-notes-heading" className="space-y-3">
            <div className="space-y-1">
              <Eyebrow>Notes</Eyebrow>
              <h2 id="folder-notes-heading" className="font-reading text-xl font-medium text-foreground">
                {countHeading(contextNotes?.length, "note", courseId ? "in this module" : "here")}
              </h2>
            </div>
            {!contextNotes ? (
              <div aria-busy="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[180px] animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
                ))}
              </div>
            ) : contextNotes.length === 0 ? (
              <HomeCard className="p-5 text-sm text-muted-foreground">
                Start one with <b className="font-medium text-foreground">New note</b> above, or upload your lecture
                slides and turn them into notes.
              </HomeCard>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
              {contextNotes
                ?.slice()
                .sort((a, b) => {
                  // Pinned notes first
                  if (a.isPinned && !b.isPinned) return -1;
                  if (!a.isPinned && b.isPinned) return 1;
                  // Then by creation date (newest first)
                  return (b.createdAt ?? 0) - (a.createdAt ?? 0);
                })
                .map((n) => (
                  <motion.div key={n._id} variants={itemVariants} className="group relative">
                    <NoteCard
                      note={n}
                      onOpen={(id) => router.push(`/dashboard?noteId=${id}`)}
                      className="h-full"
                    />
                    <div
                      className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ActionMenu
                        onPin={() => togglePinNote({ noteId: n._id })}
                        isPinned={n.isPinned}
                        onRename={() =>
                          setRenameTarget({
                            id: n._id,
                            title: n.title,
                            type: "note",
                          })
                        }
                        onDelete={() => {
                          if (confirm("Delete this note?")) {
                            deleteNote({ noteId: n._id });
                          }
                        }}
                        align="right"
                      />
                    </div>
                  </motion.div>
                ))}

              </motion.div>
            )}
          </section>

          <section aria-labelledby="folder-files-heading" className="space-y-3">
            <div className="space-y-1">
              <Eyebrow>Files</Eyebrow>
              <h2 id="folder-files-heading" className="font-reading text-xl font-medium text-foreground">
                {countHeading(contextFiles?.length, "file", courseId ? "in this module" : "here")}
              </h2>
            </div>
            {!contextFiles ? (
              <div aria-busy="true" className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
            ) : contextFiles.length === 0 ? (
              <HomeCard className="p-5 text-sm text-muted-foreground">
                {courseId ? (
                  <>
                    Add slides, readings or past papers with <b className="font-medium text-foreground">Upload</b>{" "}
                    above. Once a file is processed, drag it onto a note to generate notes from it.
                  </>
                ) : (
                  "Files filed here show up in this list."
                )}
              </HomeCard>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
              {contextFiles?.map((f) => (
                <DraggableDocument
                  key={f._id}
                  documentId={f._id}
                  documentName={f.name}
                  processingStatus={f.processingStatus}
                >
                  <motion.a
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -4 }}
                    href={f.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 p-4 rounded-xl border border-sidebar-border bg-sidebar-accent/60 backdrop-blur-sm hover:bg-sidebar-accent hover:border-sidebar-border transition-all duration-300"
                    title={f.errorMessage || undefined}
                  >
                    <div className="w-12 h-12 rounded-lg bg-sidebar-accent flex items-center justify-center group-hover:bg-sidebar-accent/80 transition-colors">
                      <File className="w-6 h-6 text-sidebar-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-sidebar-foreground truncate transition-colors">
                          {f.name}
                        </p>
                        <DocumentStatusBadge
                          status={f.processingStatus}
                          progressPercent={f.progressPercent}
                          queuePosition={f.queuePosition}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {f.processingStatus === "done"
                          ? "Drag to generate notes"
                          : new Date(f.createdAt).toLocaleDateString()}
                      </p>
                      {f.processingStatus === "error" && f.errorMessage && (
                        <p className="text-[10px] text-red-400 mt-1 line-clamp-1">
                          {f.errorMessage}
                        </p>
                      )}
                      {(f.processingStatus === "processing" ||
                        f.processingStatus === "pending") &&
                        typeof f.progressPercent === "number" && (
                          <div className="mt-2 h-1 bg-sidebar-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sidebar-primary"
                              style={{
                                width: `${Math.min(100, Math.max(0, f.progressPercent))}%`,
                              }}
                            />
                          </div>
                        )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        onRename={() => {
                          setRenameTarget({
                            id: f._id,
                            title: f.name,
                            type: "file",
                          });
                        }}
                        onDelete={() => {
                          if (confirm(`Delete "${f.name}"?`)) {
                            deleteFile({ fileId: f._id as Id<"files"> });
                          }
                        }}
                        showRetry={f.processingStatus === "error"}
                        onRetry={async () => {
                          await retryProcessing({ fileId: f._id as Id<"files"> });
                        }}
                        align="right"
                      />
                    </div>
                  </motion.a>
                </DraggableDocument>
              ))}

              </motion.div>
            )}
          </section>
        </div>
      </ScrollArea>

      {courseId && <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} courseId={courseId} />}

      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        initialValue={renameTarget?.title || ""}
        title={renameTarget?.type === "file" ? "File" : "Note"}
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
}
