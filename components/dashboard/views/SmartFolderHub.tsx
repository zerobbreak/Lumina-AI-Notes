"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { useGamification } from "@/lib/queries/users/useGamification";
import { useRecentNotes } from "@/lib/queries/notes/useRecentNotes";
import { usePinnedNotes } from "@/lib/queries/notes/usePinnedNotes";
import { useUpdateTourProgress } from "@/lib/mutations/users/useUpdateTourProgress";
import { useCreateCourse } from "@/lib/mutations/courses/useCreateCourse";
import { useDeleteCourse } from "@/lib/mutations/courses/useDeleteCourse";
import { useRenameCourse } from "@/lib/mutations/courses/useRenameCourse";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Layout } from "lucide-react";
import { useHomeSummary } from "@/lib/queries/home/useHomeSummary";
import { planHeadline } from "@/lib/home/planCopy";
import { getCourseIcon } from "@/lib/courseDisplay";
import { Course } from "@/types";
import { ActionMenu } from "@/components/shared/ActionMenu";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { motion } from "framer-motion";
import { NotesRail } from "@/components/dashboard/home/NotesRail";
import { ProductivityPanel } from "@/components/dashboard/home/ProductivityPanel";
import { AcademicPipeline } from "@/components/dashboard/home/AcademicPipeline";
import { TodayPlan } from "@/components/dashboard/home/TodayPlan";
import { ResumeCard } from "@/components/dashboard/home/ResumeCard";

const TourOverlay = lazy(() => import("@/components/dashboard/TourOverlay").then(m => ({ default: m.TourOverlay })));
import type { TourStep } from "@/components/dashboard/TourOverlay";
const AnalyticsCharts = lazy(() => import("./AnalyticsCharts"));

function getGreeting(hour: number) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const getIcon = getCourseIcon;

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
  const { data: userData } = useCurrentUser();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const renameCourse = useRenameCourse();
  const { data: recentNotes } = useRecentNotes();
  const { data: gamification } = useGamification();
  const home = useHomeSummary();

  const router = useRouter();
  const searchParams = useSearchParams();
  const updateTourProgress = useUpdateTourProgress();

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
  const { data: pinnedNotes } = usePinnedNotes(wantsPinnedNotes);

  // Rename State
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreateCourse = async () => {
    await createCourse.mutateAsync({ name: "New Course", code: "NEW 101" });
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameTarget) return;
    await renameCourse.mutateAsync({ courseId: renameTarget.id, name: newName });
    setRenameTarget(null);
  };

  const handleDeleteCourse = async (courseId: string) => {
    await deleteCourse.mutateAsync(courseId);
  };

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        id: "dashboard",
        title: "Your plan for today",
        description:
          "What's overdue, what's due soon and which cards to review, ranked so you know where to start.",
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

  const courseById = new Map(((userData.courses ?? []) as Course[]).map((c) => [c.id, c]));
  const courseOf = (courseId: string | null | undefined) =>
    courseId ? courseById.get(courseId) : undefined;
  const summary = home.data;
  const now = summary?.generatedAt ?? 0;
  const heading = summary
    ? planHeadline(summary, courseById.size > 0, now)
    : undefined;
  const streak = gamification?.currentStreak ?? 0;

  const closeTour = async (completed: boolean) => {
    setSuppressTourOverlay(true);
    await updateTourProgress.mutateAsync({ completed: completed ? true : false, step: 0 });
    router.replace("/dashboard?view=home");
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
        {/* Today: the plan replaces the greeting hero */}
        <header className="space-y-2" data-tour="dashboard-overview">
          <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span aria-hidden>·</span>
            <span className="normal-case tracking-normal font-medium">
              {getGreeting(new Date().getHours())}, {userData.name?.split(" ")[0] || "there"}
            </span>
            {streak > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="normal-case tracking-normal font-medium">
                  {streak}-day study streak
                </span>
              </>
            )}
          </p>
          {heading ? (
            <>
              <h1 className="max-w-3xl font-reading text-3xl font-medium leading-tight tracking-tight text-foreground text-balance lg:text-4xl">
                {heading.headline}
              </h1>
              {heading.lead && (
                <p className="max-w-2xl text-base text-muted-foreground">{heading.lead}</p>
              )}
            </>
          ) : (
            <div aria-hidden className="h-10 max-w-md animate-pulse rounded-lg bg-muted" />
          )}
        </header>

        <div className="space-y-6">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            {summary ? (
              <TodayPlan
                plan={summary.plan}
                planMinutes={summary.planMinutes}
                pulses={summary.courses}
                courseOf={courseOf}
                now={now}
              />
            ) : home.isError ? (
              <div className="rounded-2xl border border-border bg-card p-6 dark:bg-inset">
                <p className="text-sm font-medium text-foreground">Today&apos;s plan didn&apos;t load.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check your connection, then try again.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void home.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div aria-hidden className="h-72 animate-pulse rounded-2xl border border-border bg-card dark:bg-inset" />
            )}

            <div className="space-y-6">
              {summary?.resume && (
                <ResumeCard resume={summary.resume} course={courseOf(summary.resume.courseId)} now={now} />
              )}
              <AcademicPipeline />
            </div>
          </div>

          <NotesRail
            recentNotes={recentNotes}
            pinnedNotes={pinnedNotes}
            onRequestPinned={() => setWantsPinnedNotes(true)}
            onOpenNote={(id) => router.push(`/dashboard?noteId=${id}`)}
            lookupLabels={labelLookup}
          />

          <ProductivityPanel
            showAnalytics={showAnalytics}
            onToggle={() => setShowAnalytics((prev) => !prev)}
            headlineMetric={{
              value: `${streak}d`,
              label: "Study streak",
            }}
          >
            <Suspense
              fallback={
                <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:bg-inset">
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
              className="border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-foreground/5 dark:hover:bg-foreground/10 dark:hover:text-cyan-400 dark:hover:border-cyan-500/30 transition-colors"
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
                  className="group relative rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md dark:bg-inset dark:shadow-none dark:backdrop-blur-md hover:bg-accent/40 dark:hover:bg-foreground/10 hover:border-border/80 dark:hover:border-foreground/20 cursor-pointer transition-all duration-300 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {/* Icon in top-left */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-foreground/5 flex items-center justify-center">
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
                            void handleDeleteCourse(course.id);
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
              className="rounded-xl border border-dashed border-border bg-card/50 hover:bg-cyan-50/90 hover:border-cyan-600/40 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 p-8 min-h-[180px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
