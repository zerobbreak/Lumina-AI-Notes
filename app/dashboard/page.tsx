"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sparkles } from "lucide-react";
import { useEffect, Suspense, lazy } from "react";

const NoteView = lazy(() => import("@/components/dashboard/editor/NoteView"));
const FolderView = lazy(() => import("@/components/dashboard/views/FolderView"));
const SmartFolderHub = lazy(() => import("@/components/dashboard/views/SmartFolderHub"));
const FlashcardsView = lazy(() => import("@/components/dashboard/flashcards/FlashcardsView").then(m => ({ default: m.FlashcardsView })));
const FlashcardStudy = lazy(() => import("@/components/dashboard/flashcards/FlashcardStudy").then(m => ({ default: m.FlashcardStudy })));
const QuizzesView = lazy(() => import("@/components/dashboard/quizzes/QuizzesView").then(m => ({ default: m.QuizzesView })));
const QuizTaking = lazy(() => import("@/components/dashboard/quizzes/QuizTaking").then(m => ({ default: m.QuizTaking })));
const ArchiveView = lazy(() => import("@/components/dashboard/views/ArchiveView"));
const CalendarView = lazy(() => import("@/components/dashboard/views/CalendarView"));

function DashboardLoading() {
  return (
    <div className="h-full bg-background flex items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-2 animate-pulse">
        <Sparkles className="w-5 h-5" />
        <span>Loading Workspace...</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId");
  const contextId = searchParams.get("contextId");
  const contextType = searchParams.get("contextType") as
    | "course"
    | "module"
    | null;
  const view = searchParams.get("view");
  const deckId = searchParams.get("deckId");

  const userData = useQuery(api.users.getUser);
  const router = useRouter();

  // Redirect to onboarding if user doesn't exist or hasn't completed onboarding
  useEffect(() => {
    if (userData === null || (userData && !userData.onboardingComplete)) {
      router.replace("/onboarding");
    }
  }, [userData, router]);

  // Loading State
  if (userData === undefined) {
    return (
      <div className="h-full bg-background flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="w-5 h-5" />
          <span>Loading Workspace...</span>
        </div>
      </div>
    );
  }

  // Waiting for redirect to onboarding
  if (userData === null || !userData.onboardingComplete) {
    return (
      <div className="h-full bg-background flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="w-5 h-5" />
          <span>Redirecting to setup...</span>
        </div>
      </div>
    );
  }

  // --- VIEW 1: NOTE EDITOR ---
  if (noteId) {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <NoteView
          noteId={noteId as Id<"notes">}
          onBack={() => router.push("/dashboard")}
        />
      </Suspense>
    );
  }

  // --- VIEW 2: FLASHCARDS ---
  if (view === "flashcards") {
    if (deckId) {
      return (
        <Suspense fallback={<DashboardLoading />}>
          <FlashcardStudy deckId={deckId} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<DashboardLoading />}>
        <FlashcardsView />
      </Suspense>
    );
  }

  // --- VIEW 3: QUIZZES ---
  if (view === "quizzes") {
    if (deckId) {
      return (
        <Suspense fallback={<DashboardLoading />}>
          <QuizTaking deckId={deckId} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<DashboardLoading />}>
        <QuizzesView />
      </Suspense>
    );
  }

  // --- VIEW 4: ARCHIVE ---
  if (view === "archive") {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <ArchiveView />
      </Suspense>
    );
  }

  // --- VIEW 4b: CALENDAR ---
  if (view === "calendar") {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <CalendarView />
      </Suspense>
    );
  }

  // --- VIEW 5: SMART FOLDER OVERVIEW ---
  if (contextId) {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <FolderView contextId={contextId} contextType={contextType || "course"} />
      </Suspense>
    );
  }

  // --- VIEW 6: SMART FOLDER HUB (HOME) ---
  return (
    <Suspense fallback={<DashboardLoading />}>
      <SmartFolderHub />
    </Suspense>
  );
}
