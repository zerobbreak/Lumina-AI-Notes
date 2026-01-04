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
      0
    ) || 0;

  // Calculate statistics
  const totalNotes = recentNotes?.length || 0;
  const totalFiles = files?.length || 0;

  return (
    <ScrollArea className="flex-1 h-full bg-[#050505]">
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
              <h1 className="text-5xl font-bold text-white tracking-tight">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
                  {userData.name?.split(" ")[0] || "Student"}
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-xl">
                Your academic workspace is ready. Pick up where you left off or
                start something new.
              </p>
            </div>

            {/* Quick Stats Pills */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center gap-3 flex-wrap"
            >
              {[
                {
                  icon: Layout,
                  label: "Smart Folders",
                  value: courseCount,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10",
                  border: "border-cyan-500/20",
                },
                {
                  icon: FileText,
                  label: "Modules",
                  value: moduleCount,
                  color: "text-purple-400",
                  bg: "bg-purple-500/10",
                  border: "border-purple-500/20",
                },
                {
                  icon: FileText,
                  label: "Notes",
                  value: totalNotes,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10",
                  border: "border-amber-500/20",
                },
                ...(totalFiles > 0
                  ? [
                      {
                        icon: FileIcon,
                        label: "Files",
                        value: totalFiles,
                        color: "text-blue-400",
                        bg: "bg-blue-500/10",
                        border: "border-blue-500/20",
                      },
                    ]
                  : []),
              ].map((stat, i) => (
                <div
                  key={i}
                  className={`px-4 py-2.5 rounded-xl border ${stat.border} ${stat.bg} flex items-center gap-2.5 backdrop-blur-md transition-transform hover:scale-105`}
                >
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-sm text-gray-300">
                    <span className="text-white font-bold text-base mr-1">
                      {stat.value}
                    </span>
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>
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
              className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
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
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative h-[220px] rounded-3xl cursor-pointer"
                >
                  {/* Glass Card Background */}
                  <div className="absolute inset-0 bg-[#121212]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden transition-all duration-300 group-hover:border-white/20 group-hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    {/* Gradient Header */}
                    <div
                      className={`h-[100px] w-full bg-linear-to-br ${Gradient} opacity-60 group-hover:opacity-80 transition-opacity duration-500 relative`}
                    >
                      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay" />
                      <div className="absolute inset-0 bg-linear-to-t from-[#121212]/90 to-transparent" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    {/* Icon & Menu */}
                    <div className="flex justify-between items-start">
                      <motion.div
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="w-12 h-12 rounded-2xl bg-[#18181B] border border-white/10 flex items-center justify-center shadow-lg group-hover:shadow-cyan-500/20 group-hover:border-cyan-500/30 transition-all duration-300"
                      >
                        <Icon className="w-6 h-6 text-gray-300 group-hover:text-cyan-400 transition-colors" />
                      </motion.div>

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

                    {/* Text Info */}
                    <div className="space-y-1 z-10">
                      <h3 className="font-bold text-xl text-white truncate group-hover:text-cyan-200 transition-colors">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-cyan-400/80 bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-500/20">
                          {course.code}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                        <span className="text-xs text-gray-400">
                          {course.modules?.length || 0} Modules
                        </span>
                      </div>
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
              className="h-[220px] rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 cursor-pointer transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:scale-110 transition-all duration-300">
                <Plus className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium">Create New Course</span>
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
                className="text-xs text-gray-400 hover:text-white hover:bg-white/5"
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
                  className="group relative p-5 rounded-2xl border border-white/5 bg-[#121212]/60 hover:bg-[#18181B]/80 hover:border-white/10 hover:shadow-lg cursor-pointer transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors mb-1">
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
                    <ArrowRight className="w-4 h-4 text-gray-700 -rotate-45 opacity-0 group-hover:opacity-100 group-hover:rotate-0 transition-all duration-300" />
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
