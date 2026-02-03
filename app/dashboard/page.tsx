"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sparkles } from "lucide-react";
import { useEffect, Suspense } from "react";

import NoteView from "@/components/dashboard/editor/NoteView";
import FolderView from "@/components/dashboard/views/FolderView";
import SmartFolderHub from "@/components/dashboard/views/SmartFolderHub";
import { FlashcardsView } from "@/components/dashboard/flashcards/FlashcardsView";
import { FlashcardStudy } from "@/components/dashboard/flashcards/FlashcardStudy";
import { QuizzesView } from "@/components/dashboard/quizzes/QuizzesView";
import { QuizTaking } from "@/components/dashboard/quizzes/QuizTaking";
import ArchiveView from "@/components/dashboard/views/ArchiveView";

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
    // NoteView handles its own loading states for the note data
    return (
      <NoteView
        noteId={noteId as Id<"notes">}
        onBack={() => router.push("/dashboard")}
      />
    );
  }

  // --- VIEW 2: FLASHCARDS ---
  if (view === "flashcards") {
    if (deckId) {
      return <FlashcardStudy deckId={deckId} />;
    }
    return <FlashcardsView />;
  }

  // --- VIEW 3: QUIZZES ---
  if (view === "quizzes") {
    if (deckId) {
      return <QuizTaking deckId={deckId} />;
    }
    return <QuizzesView />;
  }

  // --- VIEW 4: ARCHIVE ---
  if (view === "archive") {
    return <ArchiveView />;
  }

  // --- VIEW 5: SMART FOLDER OVERVIEW ---
  if (contextId) {
    return (
      <FolderView contextId={contextId} contextType={contextType || "course"} />
    );
  }

  // --- VIEW 6: SMART FOLDER HUB (HOME) ---
  return <SmartFolderHub />;
}
