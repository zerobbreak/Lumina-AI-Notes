"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Id } from "@/types/data-model";
import { useResumeTarget } from "@/lib/queries/notes/useResumeTarget";
import { Sparkles } from "lucide-react";
import { Suspense, lazy, useEffect } from "react";
import { viewLoaders } from "@/components/dashboard/viewLoaders";

const NoteView = lazy(viewLoaders.note);
const FolderView = lazy(viewLoaders.folder);
const SmartFolderHub = lazy(viewLoaders.home);
const FlashcardsView = lazy(() => viewLoaders.flashcards().then(m => ({ default: m.FlashcardsView })));
const FlashcardStudy = lazy(() => viewLoaders.flashcardStudy().then(m => ({ default: m.FlashcardStudy })));
const QuizzesView = lazy(() => viewLoaders.quizzes().then(m => ({ default: m.QuizzesView })));
const QuizTaking = lazy(() => viewLoaders.quizTaking().then(m => ({ default: m.QuizTaking })));
const ArchiveView = lazy(viewLoaders.archive);
const CalendarView = lazy(viewLoaders.calendar);
const NoteStudioView = lazy(viewLoaders.studio);

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

  const router = useRouter();

  // --- VIEW 0: BARE /dashboard — resume the last note, or fall back to Home ---
  // Asked-for Home (?view=home) always wins and skips this entirely.
  const hasExplicitDestination = !!(noteId || contextId || view || deckId);
  if (!hasExplicitDestination) {
    return <ResumeGate />;
  }

  // --- VIEW 1: NOTE EDITOR ---
  if (noteId) {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <NoteView
          // A fresh editor per note: nothing typed in one note (pending
          // autosave, editor state) can carry over into the next.
          key={noteId}
          noteId={noteId as Id<"notes">}
          onBack={() => router.push("/dashboard?view=home")}
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

  // --- VIEW 4c: NOTE STUDIO ---
  if (view === "studio") {
    return (
      <Suspense fallback={<DashboardLoading />}>
        <NoteStudioView />
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

/**
 * Decides what a bare `/dashboard` open should show: the note the user was
 * last in, or the Home hub when resuming wouldn't make sense. Always
 * redirects to a concrete URL (?noteId=... or ?view=home) so the resolved
 * destination is shareable/bookmarkable and never re-runs this decision.
 */
function ResumeGate() {
  const router = useRouter();
  const { data: target } = useResumeTarget();

  useEffect(() => {
    if (!target) return;
    if (target.target === "note") {
      router.replace(`/dashboard?noteId=${target.noteId}`);
    } else {
      router.replace("/dashboard?view=home");
    }
  }, [target, router]);

  return <DashboardLoading />;
}
