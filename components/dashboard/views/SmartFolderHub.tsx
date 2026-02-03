"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Plus,
  Code,
  Dna,
  TrendingUp,
  Calculator,
  Stethoscope,
  Gavel,
  Landmark,
  Layout,
  FileText,
  Clock,
  ArrowRight,
  File as FileIcon,
  Layers,
} from "lucide-react";
import { Course } from "@/types";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { motion } from "framer-motion";

// Helper to get a nice gradient based on course code or name
const getGradient = (code: string) => {
  const gradients = [
    "from-indigo-500/20 via-purple-500/20 to-pink-500/20",
    "from-cyan-500/20 via-teal-500/20 to-emerald-500/20",
    "from-amber-500/20 via-orange-500/20 to-red-500/20",
    "from-fuchsia-500/20 via-pink-500/20 to-rose-500/20",
    "from-blue-500/20 via-indigo-500/20 to-violet-500/20",
  ];
  const index = code.length % gradients.length;
  return gradients[index];
};

const getIcon = (code: string) => {
  const c = code.toLowerCase();
  if (c.includes("cs") || c.includes("comp")) return Code;
  if (c.includes("bio")) return Dna;
  if (c.includes("bus") || c.includes("econ")) return TrendingUp;
  if (c.includes("eng") || c.includes("mech")) return Calculator;
  if (c.includes("med") || c.includes("nur")) return Stethoscope;
  if (c.includes("law")) return Gavel;
  if (c.includes("hist")) return Landmark;
  return BookOpen;
};

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
export default function SmartFolderHub() {
  const userData = useQuery(api.users.getUser);
  const createCourse = useMutation(api.users.createCourse);
  const deleteCourse = useMutation(api.users.deleteCourse);
  const renameCourse = useMutation(api.users.renameCourse);
  const recentNotes = useQuery(api.notes.getRecentNotes);
  const files = useQuery(api.files.getFiles);
  const todayQueue = useQuery(api.flashcards.getTodayQueue);
  const router = useRouter();

  // Rename State
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreateCourse = async () => {
    await createCourse({ name: "New Course", code: "NEW 101" });
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameTarget) return;
    await renameCourse({ courseId: renameTarget.id, name: newName });
    setRenameTarget(null);
  };

  if (!userData) return null;

  const courseCount = userData.courses?.length || 0;
  const moduleCount =
    userData.courses?.reduce(
      (acc: number, curr: Course) => acc + (curr.modules?.length || 0),
      0,
    ) || 0;

  // Calculate statistics
  const totalNotes = recentNotes?.length || 0;
  const totalFiles = files?.length || 0;
  const dueTodayCount = todayQueue?.cardIds?.length ?? 0;

  return (
    <ScrollArea className="flex-1 h-full bg-background">
      <div className="p-8 max-w-[1600px] mx-auto space-y-12">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl p-8 overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold text-foreground tracking-tight">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
                  {userData.name?.split(" ")[0] || "Student"}
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Your academic workspace is ready. Pick up where you left off or
                start something new.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-5 py-4 min-w-[200px]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
                  <Layers className="w-4 h-4" />
                  Cards Due Today
                </div>
                <div className="mt-2 text-3xl font-bold text-white">
                  {dueTodayCount}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard?view=flashcards")}
                  className="mt-3 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                >
                  Start reviewing
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Courses Grid */}
        <div>
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Layout className="w-4 h-4 text-cyan-500" />
              Your Courses
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCourse}
              className="rounded-full text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/50 dark:hover:border-cyan-500/30 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {userData.courses?.map((course: Course) => {
              const Icon = getIcon(course.code);

              return (
                <motion.div
                  key={course.id}
                  variants={itemVariants}
                  onClick={() =>
                    router.push(
                      `/dashboard?contextId=${course.id}&contextType=course`,
                    )
                  }
                  whileHover={{ scale: 1.02 }}
                  className="group relative rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 shadow-sm dark:shadow-none backdrop-blur-md hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer transition-all duration-300 p-5"
                >
                  {/* Icon in top-left */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-white/5 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>

                    {/* Three-dot menu in top-right */}
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ActionMenu
                        onRename={() =>
                          setRenameTarget({
                            id: course.id,
                            name: course.name,
                          })
                        }
                        onDelete={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this course?",
                            )
                          ) {
                            deleteCourse({ courseId: course.id });
                          }
                        }}
                        align="right"
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-lg text-foreground mb-3 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-200 transition-colors">
                    {course.name}
                  </h3>

                  {/* Identifier badge and module count */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/40 px-2 py-1 rounded border border-cyan-300 dark:border-cyan-500/20">
                      {course.code}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      {course.modules?.length || 0}{" "}
                      {course.modules?.length === 1 ? "Module" : "Modules"}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Create New Course Card */}
            <motion.div
              variants={itemVariants}
              onClick={handleCreateCourse}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-500/30 hover:bg-cyan-50 dark:hover:bg-cyan-500/5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 p-8 min-h-[180px]"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center">
                <Plus className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                Create New Course
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Recent Activity Section */}
        {recentNotes && recentNotes.length > 0 && (
          <div className="pb-8">
            <div className="flex items-center justify-between mb-6 px-1">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Recent Notes
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-xs text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              >
                View all
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentNotes.slice(0, 6).map((note) => (
                <motion.div
                  key={note._id}
                  variants={itemVariants}
                  onClick={() => router.push(`/dashboard?noteId=${note._id}`)}
                  whileHover={{ y: -4, x: 2 }}
                  className="group relative p-5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121212]/60 shadow-sm dark:shadow-none hover:bg-slate-50 dark:hover:bg-[#18181B]/80 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-lg cursor-pointer transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors mb-1">
                        {note.title}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-gray-700 -rotate-45 opacity-0 group-hover:opacity-100 group-hover:rotate-0 transition-all duration-300" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          initialValue={renameTarget?.name || ""}
          title="Course"
          onConfirm={handleRenameConfirm}
        />
      </div>
    </ScrollArea>
  );
}
