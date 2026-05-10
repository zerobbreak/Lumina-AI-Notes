"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
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
  Clock,
  ArrowRight,
  Layers,
  Loader2,
} from "lucide-react";
import { Course } from "@/types";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { motion } from "framer-motion";
import type { Doc } from "@/convex/_generated/dataModel";
import { NotesRail } from "@/components/dashboard/home/NotesRail";
import { StudyNextActions } from "@/components/dashboard/home/StudyNextActions";
import { ProductivityPanel } from "@/components/dashboard/home/ProductivityPanel";
import { AcademicPipeline } from "@/components/dashboard/home/AcademicPipeline";

const TourOverlay = lazy(() => import("@/components/dashboard/TourOverlay").then(m => ({ default: m.TourOverlay })));
import type { TourStep } from "@/components/dashboard/TourOverlay";
const AnalyticsCharts = lazy(() => import("./AnalyticsCharts"));

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
  const todayQueue = useQuery(api.flashcards.getTodayQueue);
  const gamification = useQuery(api.users.getUserGamificationStats);
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateTourProgress = useMutation(api.users.updateTourProgress);

  const tourParam = searchParams.get("tour");
  /** Hide overlay immediately on dismiss; cleared when URL requests tour again. */
  const [suppressTourOverlay, setSuppressTourOverlay] = useState(false);
  useEffect(() => {
    // Reset suppression only when a new tour is requested.
    // Deferring avoids the "sync setState in effect" eslint rule in this repo.
    if (tourParam === "1") {
      const id = window.setTimeout(() => setSuppressTourOverlay(false), 0);
      return () => window.clearTimeout(id);
    }
  }, [tourParam]);

  const labelLookup = useMemo(() => {
    const courses = (userData?.courses ?? []) as Course[];
    const courseMap = new Map<
      string,
      { code?: string; name: string; modules?: Array<{ id: string; title: string }> }
    >();
    courses.forEach((c) => {
      courseMap.set(c.id, { code: c.code, name: c.name, modules: c.modules });
    });
    return ({
      courseId,
      moduleId,
    }: {
      courseId?: string;
      moduleId?: string;
    }) => {
      if (!courseId) return {};
      const course = courseMap.get(courseId);
      if (!course) return {};
      const moduleEntry = moduleId
        ? course.modules?.find((m) => m.id === moduleId)
        : undefined;
      return {
        courseLabel: course.code ? `${course.code}` : course.name,
        moduleLabel: moduleEntry?.title,
      };
    };
  }, [userData?.courses]);

  const wantsTourOverlay =
    !!userData &&
    tourParam === "1" &&
    userData.tourCompleted !== true;
  const showTour = wantsTourOverlay && !suppressTourOverlay;

  // Analytics lazy-loading — only subscribe when user expands the section
  const [showAnalytics, setShowAnalytics] = useState(false);
  // Notes: only fetch pinned when user requests tab
  const [wantsPinnedNotes, setWantsPinnedNotes] = useState(false);
  const pinnedNotes = useQuery(
    api.notes.getPinnedNotes,
    wantsPinnedNotes ? {} : "skip",
  );

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

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        id: "dashboard",
        title: "Your Learning Hub",
        description:
          "This is your personalized dashboard with analytics, streaks, and daily review counts.",
        selector: '[data-tour="dashboard-overview"]',
      },
      {
        id: "quick-note",
        title: "Create a Quick Note",
        description: "Capture ideas instantly with a new quick note.",
        selector: '[data-tour="quick-note"]',
      },
      {
        id: "upload",
        title: "Upload a Resource",
        description:
          "Drop a PDF or file to extract notes and generate study tools.",
        selector: '[data-tour="upload-file"]',
      },
      {
        id: "flashcards",
        title: "Practice with Flashcards",
        description: "Review due cards with spaced repetition.",
        selector: '[data-tour="flashcards"]',
      },
      {
        id: "settings",
        title: "Personalize Your Workspace",
        description: "Update your major, note style, and theme anytime.",
        selector: '[data-tour="settings"]',
      },
    ],
    [],
  );

  if (!userData) return null;

  // Calculate statistics
  const dueTodayCount = todayQueue?.cardIds?.length ?? 0;

  const closeTour = async (completed: boolean) => {
    setSuppressTourOverlay(true);
    await updateTourProgress({ completed: completed ? true : false, step: 0 });
    router.replace("/dashboard");
  };

  return (
    <ScrollArea className="flex-1 h-full bg-background">
      {showTour && (
        <Suspense fallback={null}>
          <TourOverlay
            steps={tourSteps}
            open={showTour}
            onComplete={() => closeTour(true)}
            onSkip={() => closeTour(true)}
          />
        </Suspense>
      )}
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl p-7 lg:p-8 overflow-hidden"
          data-tour="dashboard-overview"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/12" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/12" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-700 to-blue-700 dark:from-cyan-400 dark:to-blue-500">
                  {userData.name?.split(" ")[0] || "Student"}
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Your academic workspace is ready. Pick up where you left off or
                start something new.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="rounded-2xl border border-border bg-card text-card-foreground px-5 py-4 min-w-[200px] shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0 dark:backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  <Layers className="w-4 h-4 shrink-0" aria-hidden />
                  Cards Due Today
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                  {dueTodayCount}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard?view=flashcards")}
                  className="mt-3 -ml-2 h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-white/5"
                >
                  Start reviewing
                  <ArrowRight className="w-3 h-3 ml-1" aria-hidden />
                </Button>
              </div>
              <div className="rounded-2xl border border-border bg-card text-card-foreground px-5 py-4 min-w-[200px] shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0 dark:backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
                  <Clock className="w-4 h-4 shrink-0" aria-hidden />
                  Study Streak
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                  {gamification?.currentStreak ?? 0}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Longest: {gamification?.longestStreak ?? 0} days
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Workspace (stacked sections) */}
        <div className="space-y-6">
          <NotesRail
            recentNotes={recentNotes as Doc<"notes">[] | undefined}
            pinnedNotes={pinnedNotes as Doc<"notes">[] | undefined}
            onRequestPinned={() => setWantsPinnedNotes(true)}
            onOpenNote={(id) => router.push(`/dashboard?noteId=${id}`)}
            lookupLabels={labelLookup}
          />

          <StudyNextActions
            dueTodayCount={dueTodayCount}
            streakDays={gamification?.currentStreak ?? 0}
            recentNote={recentNotes?.[0] as Doc<"notes"> | undefined}
            onStartFlashcards={() => router.push("/dashboard?view=flashcards")}
            onOpenRecentNote={(id) => router.push(`/dashboard?noteId=${id}`)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ProductivityPanel
              showAnalytics={showAnalytics}
              onToggle={() => setShowAnalytics((prev) => !prev)}
              headlineMetric={{
                value: `${gamification?.currentStreak ?? 0}d`,
                label: "Study streak",
              }}
            >
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:border-white/10 dark:bg-black/40">
                    <Loader2
                      className="w-6 h-6 animate-spin mx-auto text-muted-foreground"
                      aria-hidden
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading analytics...
                    </p>
                  </div>
                }
              >
                <AnalyticsCharts showAnalytics={showAnalytics} />
              </Suspense>
            </ProductivityPanel>

            <AcademicPipeline className="lg:sticky lg:top-6" />
          </div>
        </div>

        {/* Courses Grid */}
        <div>
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Layout className="w-4 h-4 text-cyan-600 dark:text-cyan-500 shrink-0" aria-hidden />
              Your Courses
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCourse}
              className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-cyan-400 dark:hover:border-cyan-500/30 transition-colors"
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
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    router.push(
                      `/dashboard?contextId=${course.id}&contextType=course`,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(
                        `/dashboard?contextId=${course.id}&contextType=course`,
                      );
                    }
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="group relative rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:backdrop-blur-md hover:bg-accent/40 dark:hover:bg-white/10 hover:border-border/80 dark:hover:border-white/20 cursor-pointer transition-all duration-300 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                    <span className="text-xs text-muted-foreground">
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
              role="button"
              tabIndex={0}
              onClick={handleCreateCourse}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleCreateCourse();
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-xl border border-dashed border-border bg-card/50 hover:bg-cyan-50/90 dark:border-white/10 hover:border-cyan-600/40 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 p-8 min-h-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
