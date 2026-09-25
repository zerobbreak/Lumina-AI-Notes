"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";
import { useUpdateTourProgress } from "@/lib/mutations/users/useUpdateTourProgress";
import { TOURS } from "@/lib/tour/tours";

const TourOverlay = lazy(() =>
  import("@/components/dashboard/TourOverlay").then((m) => ({ default: m.TourOverlay })),
);

const AUTO = "auto";

/**
 * The walkthrough of Home and the sidebar. It opens by itself for anyone who
 * hasn't finished or skipped it, picking up at the step they left, and again
 * whenever the URL carries `tour=<anything>` (onboarding, or "Take the tour"
 * in the command palette, which puts a fresh value there each time).
 */
export function HomeTour({ ready }: { ready: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useCurrentUser();
  const updateTourProgress = useUpdateTourProgress();
  const { leftSidebarState, setLeftSidebarState } = useDashboard();

  const tourParam = searchParams.get("tour");
  const run = tourParam ?? (user?.tourCompleted === false ? AUTO : null);
  // Which run was closed, so a new request can open it again. Closing any run
  // also rules out the automatic one for this visit, even if a late progress
  // response briefly says the tour isn't finished.
  const [closedRun, setClosedRun] = useState<string | null>(null);
  const open =
    ready && !!user && run !== null && run !== closedRun && !(run === AUTO && closedRun !== null);

  const steps = TOURS.home;
  // A replay starts over; a first run resumes where it stopped.
  const initialStep = user?.tourCompleted ? 0 : Math.min(user?.tourStep ?? 0, steps.length - 1);

  // Half the tour points into the sidebar, so show it in full on wide screens.
  useEffect(() => {
    if (!open || leftSidebarState === "open") return;
    if (window.matchMedia("(min-width: 768px)").matches) setLeftSidebarState("open");
    // Only when the tour opens; the user can collapse it again afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setClosedRun(run);
    updateTourProgress.mutate({ completed: true, step: 0 });
    if (tourParam) router.replace("/dashboard?view=home");
  };

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <TourOverlay
        key={run}
        steps={steps}
        open
        initialStep={initialStep}
        onStepChange={(step) => updateTourProgress.mutate({ step })}
        onComplete={close}
        onSkip={close}
      />
    </Suspense>
  );
}
