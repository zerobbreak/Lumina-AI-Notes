"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { useAppCommand } from "@/lib/appCommands";
import { TOURS, tourSeenKey } from "@/lib/tour/tours";

const TourOverlay = lazy(() =>
  import("@/components/dashboard/TourOverlay").then((m) => ({ default: m.TourOverlay })),
);

/** Lets the note lay out first, so the tour has something to point at. */
const OPEN_DELAY_MS = 700;

function hasSeen() {
  try {
    return window.localStorage.getItem(tourSeenKey("note")) === "1";
  } catch {
    // No storage (private window, blocked site data): don't nag every visit.
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(tourSeenKey("note"), "1");
  } catch {
    // Nothing to do; worst case it shows again.
  }
}

/**
 * The walkthrough of the note screen: the first time someone opens a note
 * they can edit, and again from "Tour the note editor" in the command palette.
 */
export function NoteTour({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!enabled || hasSeen()) return;
    const id = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [enabled]);

  useAppCommand("tour:note", () => {
    setRun((r) => r + 1);
    setOpen(true);
  });

  const close = () => {
    setOpen(false);
    markSeen();
  };

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <TourOverlay key={run} steps={TOURS.note} open onComplete={close} onSkip={close} />
    </Suspense>
  );
}
