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
} from "lucide-react";
import { Course } from "@/lib/types";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";

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

// Helper function to calculate notes from this week (defined outside component to avoid React compiler issues)
function calculateNotesThisWeek(recentNotes: Array<{ createdAt: number }> | undefined): number {
  if (!recentNotes) return 0;
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const weekAgo = Date.now() - oneWeekMs;
  return recentNotes.filter((note) => note.createdAt >= weekAgo).length;
}

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

  // Calculate notes from this week (using helper function to avoid React compiler issues)
  const notesThisWeek = calculateNotesThisWeek(recentNotes);

  if (!userData) return null;

  const courseCount = userData.courses?.length || 0;
  const moduleCount =
    userData.courses?.reduce(
      (acc: number, curr: Course) => acc + (curr.modules?.length || 0),
      0
    ) || 0;
  
  // Calculate statistics
  const totalNotes = recentNotes?.length || 0;
  const totalFiles = files?.length || 0;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#0A0A0A] p-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Welcome back,{" "}
            <span className="text-cyan-400">
              {userData.name?.split(" ")[0] || "Student"}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Your academic workspace is ready.
          </p>
        </div>

        {/* Quick Stats Pills */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex items-center gap-3 flex-wrap"
        >
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-md">
            <Layout className="w-4 h-4 text-cyan-400" />
            <span>
              <span className="text-white font-semibold">{courseCount}</span>{" "}
              Smart Folders
            </span>
          </div>
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-md">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>
              <span className="text-white font-semibold">{moduleCount}</span>{" "}
              Modules
            </span>
          </div>
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-md">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>
              <span className="text-white font-semibold">{totalNotes}</span>{" "}
              Notes
            </span>
          </div>
          {totalFiles > 0 && (
            <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-sm text-gray-300 backdrop-blur-md">
              <FileIcon className="w-4 h-4 text-blue-400" />
              <span>
                <span className="text-white font-semibold">{totalFiles}</span>{" "}
                Files
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Courses Grid */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Your Courses
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateCourse}
            className="text-xs text-gray-300 border-white/10 hover:bg-white/5 hover:text-cyan-400 transition-colors bg-transparent"
          >
            <Plus className="w-3.5 h-3.5 mr-2" />
            Add Course
          </Button>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {userData.courses?.map((course: Course) => {
            const Gradient = getGradient(course.code);
            const Icon = getIcon(course.code);

            return (
              <motion.div
                key={course.id}
                variants={itemVariants}
                onClick={() =>
                  router.push(
                    `/dashboard?contextId=${course.id}&contextType=course`
                  )
                }
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative aspect-16/10 rounded-2xl border border-white/5 bg-[#121212] cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:border-white/10 z-0 hover:z-10"
              >
                {/* Cover Area */}
                {/* Added rounded-t-2xl and overflow-hidden here to contain the gradient/noise but let the parent be visible for the menu */}
                <div
                  className={`h-1/2 w-full bg-linear-to-br ${Gradient} relative opacity-80 group-hover:opacity-100 transition-opacity rounded-t-2xl overflow-hidden`}
                >
                  {/* Mesh/Noise pattern overlay */}
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-linear-to-t from-[#121212] to-transparent" />
                </div>

                {/* Content Area */}
                <div className="p-5 relative">
                  {/* Floating Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="absolute -top-6 left-5 w-12 h-12 rounded-xl bg-[#18181B] border border-white/10 flex items-center justify-center shadow-xl group-hover:border-cyan-500/30 transition-colors duration-300"
                  >
                    <Icon className="w-6 h-6 text-gray-200 group-hover:text-cyan-400 transition-colors" />
                  </motion.div>

                  <div className="mt-5 space-y-1">
                    <h3 className="font-semibold text-lg text-white truncate group-hover:text-cyan-100 transition-colors">
                      {course.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-cyan-500/70 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/10">
                        {course.code}
                      </p>
                      <span className="text-[10px] text-gray-600">
                        {course.modules?.length || 0} Modules
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionMenu
                      onRename={() =>
                        setRenameTarget({ id: course.id, name: course.name })
                      }
                      onDelete={() => {
                        if (
                          confirm(
                            "Are you sure you want to delete this course?"
                          )
                        ) {
                          deleteCourse({ courseId: course.id });
                        }
                      }}
                      align="right"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
          {/* Add New Card Slot */}
          <motion.div
            variants={itemVariants}
            onClick={handleCreateCourse}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="aspect-16/10 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 cursor-pointer transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Create New Folder</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Recent Activity Section */}
      {recentNotes && recentNotes.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Notes
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-xs text-gray-400 hover:text-cyan-400"
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
                onClick={() =>
                  router.push(`/dashboard?noteId=${note._id}`)
                }
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group relative p-4 rounded-xl border border-white/5 bg-[#121212] hover:bg-[#18181B] hover:border-white/10 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate group-hover:text-cyan-100 transition-colors mb-1">
                      {note.title}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <FileText className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Summary */}
      {notesThisWeek > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="p-6 rounded-2xl border border-cyan-500/20 bg-linear-to-br from-cyan-500/5 to-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Great progress this week!
              </h3>
              <p className="text-sm text-gray-400">
                You&apos;ve created <span className="text-cyan-400 font-semibold">{notesThisWeek}</span>{" "}
                {notesThisWeek === 1 ? "note" : "notes"} in the last 7 days.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <RenameDialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        initialValue={renameTarget?.name || ""}
        title="Course"
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
}
