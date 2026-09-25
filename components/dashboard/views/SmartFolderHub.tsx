"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { useGamification } from "@/lib/queries/users/useGamification";
import { useRecentNotes } from "@/lib/queries/notes/useRecentNotes";
import { usePinnedNotes } from "@/lib/queries/notes/usePinnedNotes";
import { useHomeSummary } from "@/lib/queries/home/useHomeSummary";
import { useUpdateTourProgress } from "@/lib/mutations/users/useUpdateTourProgress";
import { useCreateCourse } from "@/lib/mutations/courses/useCreateCourse";
import { useDeleteCourse } from "@/lib/mutations/courses/useDeleteCourse";
import { useRenameCourse } from "@/lib/mutations/courses/useRenameCourse";
import { usePlanChecklist } from "@/lib/home/planChecklist";
import { planAction, planHeadline } from "@/lib/home/planCopy";
import { Button } from "@/components/ui/button";
import { Course } from "@/types";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotesRail } from "@/components/dashboard/home/NotesRail";
import { ProductivityPanel } from "@/components/dashboard/home/ProductivityPanel";
import { HomeHeader } from "@/components/dashboard/home/HomeHeader";
import { RunwayStrip } from "@/components/dashboard/home/RunwayStrip";
import { TodayPlan } from "@/components/dashboard/home/TodayPlan";
import { ResumeCard } from "@/components/dashboard/home/ResumeCard";
import { ComingUpCard } from "@/components/dashboard/home/ComingUpCard";
import { StudyStreakCard } from "@/components/dashboard/home/StudyStreakCard";
import { QuickCaptureCard } from "@/components/dashboard/home/QuickCaptureCard";
import { CoursePulseGrid } from "@/components/dashboard/home/CoursePulseGrid";

const TourOverlay = lazy(() => import("@/components/dashboard/TourOverlay").then(m => ({ default: m.TourOverlay })));
import type { TourStep } from "@/components/dashboard/TourOverlay";
const AnalyticsCharts = lazy(() => import("./AnalyticsCharts"));

export default function SmartFolderHub() {
  const { data: userData } = useCurrentUser();
  const createCourse = useCreateCourse();
  const deleteCourse = useDeleteCourse();
  const renameCourse = useRenameCourse();
  const { data: recentNotes } = useRecentNotes();
  const { data: gamification } = useGamification();
  const home = useHomeSummary();
  const summary = home.data;
  const [mountedAt] = useState(() => Date.now());
  const now = summary?.generatedAt ?? mountedAt;
  const checklist = usePlanChecklist(summary?.plan ?? [], now);

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
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    return ({ courseId }: { courseId?: string }) => {
      const course = courseId ? courseMap.get(courseId) : undefined;
      if (!course) return {};
      return { courseLabel: course.code || course.name };
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
    await createCourse.mutateAsync({ name: "New module", code: "" });
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

  const courses = (userData.courses ?? []) as Course[];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const courseOf = (courseId: string | null | undefined) =>
    courseId ? courseById.get(courseId) : undefined;
  const streak = gamification?.currentStreak ?? 0;

  const rows = checklist.rows;
  const nextUp = rows.find((r) => !r.done)?.item;
  const headline = summary
    ? planHeadline(
        {
          total: rows.length,
          done: rows.filter((r) => r.done).length,
          minutesLeft: rows.filter((r) => !r.done).reduce((n, r) => n + r.item.minutes, 0),
          next: nextUp,
        },
        courses.length > 0,
        now,
      )
    : undefined;
  const overdueInPlan = rows.filter((r) => r.item.kind === "overdue").length;
  const hiddenOverdue = summary
    ? Math.max(0, summary.runway.overdue.filter((d) => d.kind !== "event").length - overdueInPlan)
    : 0;

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
      <div className="mx-auto max-w-[1400px] space-y-8 p-6 lg:p-8">
        <HomeHeader
          now={now}
          firstName={userData.name?.split(" ")[0]}
          headline={headline}
          action={nextUp ? planAction(nextUp) : null}
        />

        {summary ? (
          <>
            <RunwayStrip
              deadlines={summary.runway.deadlines}
              overdue={summary.runway.overdue}
              pulses={summary.courses}
              courseOf={courseOf}
              now={now}
            />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <TodayPlan
                rows={rows}
                onToggle={checklist.setDone}
                hiddenOverdue={hiddenOverdue}
                pulses={summary.courses}
                courseOf={courseOf}
                now={now}
              />
              <div className="flex flex-col gap-4">
                {summary.resume && (
                  <ResumeCard resume={summary.resume} course={courseOf(summary.resume.courseId)} now={now} />
                )}
                <ComingUpCard
                  overdue={summary.runway.overdue}
                  upcoming={summary.runway.deadlines}
                  courseOf={courseOf}
                  now={now}
                />
                {/* Absent from an API deployed before the strip existed. */}
                {summary.studyDays && <StudyStreakCard days={summary.studyDays} streak={streak} now={now} />}
                <QuickCaptureCard />
              </div>
            </div>

            <CoursePulseGrid
              courses={courses}
              pulses={summary.courses}
              now={now}
              onCreate={() => void handleCreateCourse()}
              onRename={(course) => setRenameTarget({ id: course.id, name: course.name })}
              onDelete={(course) => {
                if (confirm(`Delete ${course.name}? This can't be undone.`)) {
                  void handleDeleteCourse(course.id);
                }
              }}
            />
          </>
        ) : home.isError ? (
          <div className="rounded-xl border border-border bg-card p-6 dark:bg-inset">
            <p className="text-sm font-medium text-foreground">Today&apos;s plan didn&apos;t load.</p>
            <p className="mt-1 text-sm text-muted-foreground">Check your connection, then try again.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void home.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div aria-hidden className="space-y-6">
            <div className="h-48 animate-pulse rounded-xl border border-border bg-card dark:bg-inset" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <div className="h-80 animate-pulse rounded-xl border border-border bg-card dark:bg-inset" />
              <div className="h-80 animate-pulse rounded-xl border border-border bg-card dark:bg-inset" />
            </div>
          </div>
        )}

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

        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          initialValue={renameTarget?.name || ""}
          title="Module"
          onConfirm={handleRenameConfirm}
        />
      </div>
    </ScrollArea>
  );
}
