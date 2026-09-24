"use client";

import { ClipboardList, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { useNoteStudy } from "./useNoteStudy";

type Study = ReturnType<typeof useNoteStudy>;

/**
 * Flashcards and the quiz made from this note, or, before there are any, the
 * buttons that make them.
 */
export function StudyCard({
  study,
  onMakeFlashcards,
  onMakeQuiz,
  onNavigate,
}: {
  study: Study;
  onMakeFlashcards: () => void;
  onMakeQuiz: () => void;
  /** Called before leaving the note, so the dock can close. */
  onNavigate: () => void;
}) {
  const router = useRouter();
  const go = (href: string) => {
    onNavigate();
    router.push(href);
  };

  if (study.isLoading) {
    return <p className="text-[12.5px] text-muted-foreground">Loading…</p>;
  }

  const { primaryDeck, quiz, latestResult, cards, due, fresh } = study;

  return (
    <div className="space-y-3">
      {primaryDeck ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">
                {due > 0 ? `${due} card${due === 1 ? "" : "s"} due` : "All caught up"}
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                {cards} flashcard{cards === 1 ? "" : "s"} from this note
              </p>
            </div>
          </div>
          {cards > 0 && <ProgressBar known={cards - due - fresh} due={due} fresh={fresh} />}
          <Button
            size="sm"
            className="h-7 w-full text-[12.5px]"
            onClick={() => go(`/dashboard?view=flashcards&deckId=${primaryDeck._id}`)}
          >
            {due > 0 ? "Review now" : "Open deck"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            No flashcards from this note yet.
          </p>
          <Button size="sm" className="h-7 w-full text-[12.5px]" onClick={onMakeFlashcards}>
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Make flashcards
          </Button>
        </div>
      )}

      <div className="border-t border-border pt-3">
        {quiz ? (
          <button
            type="button"
            onClick={() => go(`/dashboard?view=quizzes&deckId=${quiz._id}`)}
            className="-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-foreground">Quiz</span>
              <span className="block text-[11.5px] text-muted-foreground">
                {latestResult
                  ? `Last score ${latestResult.score} / ${latestResult.totalQuestions}`
                  : `${quiz.questionCount} questions · not taken yet`}
              </span>
            </span>
            <span className="text-[12px] font-medium text-primary">{latestResult ? "Retake" : "Start"}</span>
          </button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 w-full text-[12.5px]" onClick={onMakeQuiz}>
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Make a quiz
          </Button>
        )}
      </div>
    </div>
  );
}

/** Known / due / new, as one bar. */
function ProgressBar({ known, due, fresh }: { known: number; due: number; fresh: number }) {
  const total = Math.max(known + due + fresh, 1);
  const pct = (n: number) => `${(Math.max(n, 0) / total) * 100}%`;
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-accent" aria-hidden>
        <span className="bg-primary" style={{ width: pct(known) }} />
        <span className="bg-warning" style={{ width: pct(due) }} />
      </div>
      <p className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
        <span>{Math.max(known, 0)} known</span>
        <span>{due} due</span>
        <span>{fresh} new</span>
      </p>
    </div>
  );
}
