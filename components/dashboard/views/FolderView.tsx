"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  BookOpen,
  Folder,
  FileText,
  Plus,
  File,
  Clock,
  Pin,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Course, Module } from "@/types";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { EditableTitle } from "@/components/shared/EditableTitle";
import { DraggableDocument, DocumentStatusBadge } from "@/components/documents";
import { EmptyState } from "@/components/shared/EmptyState";
import { useState } from "react";

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
  const userData = useQuery(api.users.getUser);

  // --- Queries ---
  const contextNotes = useQuery(
    api.notes.getNotesByContext,
    contextId
      ? {
          courseId: contextType === "course" ? contextId : undefined,
          moduleId: contextType === "module" ? contextId : undefined,
        }
      : "skip"
  );

  const contextFiles = useQuery(
    api.files.getFilesByContext,
    contextId && contextType === "course" ? { courseId: contextId } : "skip"
  );

  const createNote = useMutation(api.notes.createNote);
  const addModule = useMutation(api.users.addModuleToCourse);
  const renameModule = useMutation(api.users.renameModule);
  const deleteModule = useMutation(api.users.deleteModule);
  const deleteFile = useMutation(api.files.deleteFile);
  const retryProcessing = useMutation(api.files.retryProcessing);
  const processDocument = useAction(api.ai.processDocument);
  const renameFile = useMutation(api.files.renameFile);
  const togglePinNote = useMutation(api.notes.togglePinNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const renameNote = useMutation(api.notes.renameNote);

  const [renameTarget, setRenameTarget] = useState<{
    id: string | Id<"files"> | Id<"notes">;
    title: string;
    type: "module" | "file" | "note";
  } | null>(null);

  // --- Helpers ---
  const getCurrentCourse = () => {
    if (!userData || contextType !== "course") return null;
    return userData.courses?.find((c: Course) => c.id === contextId);
  };

  const getDefaultNoteStyle = () => {
    if (!userData) return "standard";
    if (contextType === "course") {
      return getCurrentCourse()?.defaultNoteStyle ?? userData.noteStyle ?? "standard";
    }
    if (contextType === "module") {
      for (const c of userData.courses || []) {
        if (c.modules?.some((m: Module) => m.id === contextId)) {
          return c.defaultNoteStyle ?? userData.noteStyle ?? "standard";
        }
      }
    }
    return userData.noteStyle ?? "standard";
  };

  const getContextName = () => {
    if (!userData || !contextId) return "Folder";
    if (contextType === "course") {
      const course = getCurrentCourse();
      return course ? `${course.code} - ${course.name}` : "Course";
    }
    if (contextType === "module") {
      for (const c of userData.courses || []) {
        const mod = c.modules?.find((m: Module) => m.id === contextId);
        if (mod) return mod.title;
      }
      return "Module";
    }
    return "Smart Folder";
  };

  // Get current module and its parent course ID for rename operations
  const getCurrentModuleData = () => {
    if (!userData || contextType !== "module") return null;
    for (const c of userData.courses || []) {
      const mod = c.modules?.find((m: Module) => m.id === contextId);
      if (mod) return { module: mod, courseId: c.id };
    }
    return null;
  };

  const currentModuleData = getCurrentModuleData();

  // --- Handlers ---
  const handleCreateNoteInContext = async () => {
    try {
      const newNoteId = await createNote({
        title: "Untitled Note",
        courseId: contextType === "course" ? contextId : undefined,
        moduleId: contextType === "module" ? contextId : undefined,
        style: getDefaultNoteStyle(),
      });
      router.push(`/dashboard?noteId=${newNoteId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddModule = async () => {
    if (contextType !== "course") return;
    try {
      await addModule({ courseId: contextId, title: "New Module" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenameConfirm = async (newTitle: string) => {
    if (!renameTarget) return;
    if (renameTarget.type === "module") {
      await renameModule({
        courseId: contextId,
        moduleId: renameTarget.id as string,
        title: newTitle,
      });
    } else if (renameTarget.type === "file") {
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

  const currentCourse = getCurrentCourse();

  return (
    <div className="h-full flex flex-col relative bg-[#0A0A0A]">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-64 flex flex-col justify-end px-12 pb-10 border-b border-white/5 overflow-hidden"
      >
        {/* Background Art */}
        <div className="absolute inset-0 bg-linear-to-r from-indigo-900/30 via-purple-900/20 to-black/0 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 w-full h-48 bg-linear-to-t from-[#050505] to-transparent" />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-3 text-sm text-gray-400 mb-6"
          >
            <span
              className="hover:text-cyan-400 cursor-pointer transition-colors"
              onClick={() => router.push("/dashboard")}
            >
              Smart Folders
            </span>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <span className="text-white font-medium bg-white/5 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              {getContextName()}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl">
                {contextType === "course" ? (
                  <BookOpen className="w-8 h-8 text-cyan-400" />
                ) : (
                  <Folder className="w-8 h-8 text-cyan-400" />
                )}
              </div>
              {contextType === "module" && currentModuleData ? (
                <EditableTitle
                  initialValue={currentModuleData.module.title}
                  onSave={async (newTitle) => {
                    await renameModule({
                      courseId: currentModuleData.courseId,
                      moduleId: contextId,
                      title: newTitle,
                    });
                  }}
                  className="text-5xl font-bold text-white tracking-tight hover:bg-white/5 rounded px-2 -ml-2 transition-colors cursor-text"
                  placeholder="Untitled Module"
                />
              ) : (
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight line-clamp-2 leading-tight max-w-4xl">
                  {getContextName()}
                </h1>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <ScrollArea className="flex-1 bg-[#050505]">
        <div className="max-w-[1600px] mx-auto py-12 px-12 space-y-12">
          {/* MODULES SECTION (Only for Course context) */}
          {contextType === "course" && currentCourse && (
            <section>
              <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Folder className="w-4 h-4 text-purple-500" />
                  Modules ({currentCourse.modules?.length || 0})
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-purple-400 hover:border-purple-500/30 transition-all duration-300"
                  onClick={handleAddModule}
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Add Module
                </Button>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {currentCourse.modules?.map((mod: Module) => (
                  <motion.div
                    key={mod.id}
                    variants={itemVariants}
                    onClick={() =>
                      router.push(
                        `/dashboard?contextId=${mod.id}&contextType=module`
                      )
                    }
                    whileHover={{ scale: 1.02 }}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-[#121212]/80 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:bg-[#18181B]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <Folder className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-purple-200 transition-colors">
                        {mod.title}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        onRename={() =>
                          setRenameTarget({
                            id: mod.id,
                            title: mod.title,
                            type: "module",
                          })
                        }
                        onDelete={() => {
                          if (confirm("Delete this module?")) {
                            deleteModule({
                              courseId: contextId,
                              moduleId: mod.id,
                            });
                          }
                        }}
                        align="right"
                      />
                    </div>
                  </motion.div>
                ))}

                {(!currentCourse.modules ||
                  currentCourse.modules.length === 0) && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<Folder className="w-8 h-8 text-purple-400" />}
                      title="No modules yet"
                      description="Create modules to organize your notes into topics or chapters"
                      action={{
                        label: "Add Module",
                        onClick: handleAddModule,
                      }}
                    />
                  </div>
                )}
              </motion.div>
            </section>
          )}

          {contextType === "course" && <Separator className="bg-white/5" />}

          {/* NOTES SECTION */}
          <section>
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500" />
                Notes
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-300"
                onClick={handleCreateNoteInContext}
              >
                <Plus className="w-3.5 h-3.5 mr-2" />
                New Note
              </Button>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {/* Create New Card */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateNoteInContext}
                className="rounded-xl border border-dashed border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 p-8 min-h-[180px]"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-cyan-400">Create New Note</span>
              </motion.div>

              {contextNotes
                ?.sort((a, b) => {
                  // Pinned notes first
                  if (a.isPinned && !b.isPinned) return -1;
                  if (!a.isPinned && b.isPinned) return 1;
                  // Then by creation date (newest first)
                  return b.createdAt - a.createdAt;
                })
                .map((n) => (
                  <motion.div
                    key={n._id}
                    variants={itemVariants}
                    onClick={() => router.push(`/dashboard?noteId=${n._id}`)}
                    whileHover={{ scale: 1.02 }}
                    className="group relative rounded-xl border border-white/10 bg-[#121212] hover:bg-[#18181B] hover:border-white/20 cursor-pointer transition-all duration-300 p-5"
                  >
                    {/* Icon in top-left and menu in top-right */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-cyan-400" />
                      </div>
                      
                      <div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-lg text-white mb-3 line-clamp-2 group-hover:text-cyan-200 transition-colors">
                      {n.title}
                    </h3>

                    {/* Identifier badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/20">
                        {n.style?.toUpperCase() || "NOTE"}
                      </span>
                      {n.isPinned && (
                        <Pin className="w-3 h-3 text-amber-400" />
                      )}
                    </div>
                  </motion.div>
                ))}

              {(!contextNotes || contextNotes.length === 0) && (
                <div className="col-span-full">
                  <EmptyState
                    icon={<FileText className="w-8 h-8 text-cyan-400" />}
                    title="No notes yet"
                    description="Create your first note to start organizing your thoughts and ideas"
                    action={{
                      label: "Create Note",
                      onClick: handleCreateNoteInContext,
                    }}
                  />
                </div>
              )}
            </motion.div>
          </section>

          <Separator className="bg-white/5" />

          {/* FILES SECTION */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-6 px-1">
              <File className="w-4 h-4 text-indigo-500" />
              Files & Resources
            </h2>

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
                    className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-[#121212]/80 backdrop-blur-sm hover:bg-[#18181B] hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300"
                    title={f.errorMessage || undefined}
                  >
                    <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                      <File className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">
                          {f.name}
                        </p>
                        <DocumentStatusBadge
                          status={f.processingStatus}
                          progressPercent={f.progressPercent}
                          queuePosition={f.queuePosition}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
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
                          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
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
                            deleteFile({ fileId: f._id });
                          }
                        }}
                        showRetry={f.processingStatus === "error"}
                        onRetry={async () => {
                          await retryProcessing({ fileId: f._id });
                          await processDocument({ fileId: f._id });
                        }}
                        align="right"
                      />
                    </div>
                  </motion.a>
                </DraggableDocument>
              ))}

              {(!contextFiles || contextFiles.length === 0) && (
                <EmptyState
                  icon={<File className="w-8 h-8 text-indigo-400" />}
                  title="No files yet"
                  description="Upload files to enhance your notes with additional resources"
                  className="py-8"
                />
              )}
            </motion.div>
          </section>
        </div>
      </ScrollArea>

      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        initialValue={renameTarget?.title || ""}
        title={renameTarget?.type === "file" ? "File" : "Module"}
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
}
