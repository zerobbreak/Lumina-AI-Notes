"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, HomeCard, readinessTone } from "@/components/dashboard/home/parts";
import { timeAgo } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { StudySetDto } from "@/types/api/courseOverview";

const COLLAPSED_ROWS = 6;

export const studySetHref = (set: Pick<StudySetDto, "kind" | "id">) =>
  `/dashboard?view=${set.kind === "deck" ? "flashcards" : "quizzes"}&deckId=${set.id}`;

function detail(set: StudySetDto, now: number) {
  if (set.kind === "deck") {
    const cards = `${set.total} card${set.total === 1 ? "" : "s"}`;
    if (set.total === 0) return "Empty deck";
    if (set.dueToday > 0) return `${cards} · ${set.dueToday} due today`;
    return set.lastStudiedAt ? `${cards} · studied ${timeAgo(set.lastStudiedAt, now)}` : `${cards} · not studied yet`;
  }
  const questions = `${set.questionCount} question${set.questionCount === 1 ? "" : "s"}`;
  return set.takenAt ? `${questions} · taken ${timeAgo(set.takenAt, now)}` : `${questions} · not taken yet`;
}

function actionLabel(set: StudySetDto) {
  if (set.kind === "quiz") return set.takenAt ? "Retake" : "Take";
  return set.dueToday > 0 ? "Review" : "Study";
}

/** A bar for 0–1 mastery; toned like readiness so weak sets stand out. */
function MasteryBar({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Not measured yet</span>;
  const tone = readinessTone(value);
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <div
          className={cn(
            "h-full rounded-full",
            tone === "critical" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${Math.max(value * 100, 2)}%` }}
        />
      </div>
      <span className="w-9 text-right font-mono text-xs tabular-nums text-foreground">{Math.round(value * 100)}%</span>
    </div>
  );
}

/** The module's flashcard decks and quizzes, the ones needing most work first. */
export function StudySetsTable({ sets, now }: { sets: StudySetDto[]; now: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? sets : sets.slice(0, COLLAPSED_ROWS);

  return (
    <section aria-labelledby="study-sets-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <Eyebrow>Flashcards and quizzes</Eyebrow>
          <h2 id="study-sets-heading" className="font-reading text-xl font-medium text-foreground">
            {sets.length === 0 ? "Nothing to practise yet" : "What needs work, weakest first"}
          </h2>
        </div>
      </div>

      {sets.length === 0 ? (
        <HomeCard className="p-5 text-sm text-muted-foreground">
          Open a note in this module and generate flashcards or a quiz from it. They&apos;ll show up here with how
          well you know them.
        </HomeCard>
      ) : (
        <HomeCard className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_6rem] gap-4 border-b border-border/70 bg-muted/40 px-5 py-2.5 sm:grid dark:bg-foreground/[0.02]">
            <Eyebrow>Set</Eyebrow>
            <Eyebrow>Mastery</Eyebrow>
            <span className="sr-only">Action</span>
          </div>
          <ul>
            {shown.map((set) => {
              const Icon = set.kind === "deck" ? Layers : ListChecks;
              return (
                <li
                  key={`${set.kind}:${set.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border/70 px-5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_6rem]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{set.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="sr-only">{set.kind === "deck" ? "Flashcard deck, " : "Quiz, "}</span>
                        {detail(set, now)}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                    <MasteryBar value={set.mastery} label={`${set.title} mastery`} />
                  </div>
                  <Button asChild size="sm" variant="outline" className="col-start-2 row-start-1 h-8 justify-self-end sm:col-start-auto sm:row-start-auto">
                    <Link href={studySetHref(set)} aria-label={`${actionLabel(set)} ${set.title}`}>
                      {actionLabel(set)}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
          {sets.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="w-full border-t border-border/70 px-5 py-2.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {expanded ? "Show fewer" : `Show all ${sets.length}`}
            </button>
          )}
        </HomeCard>
      )}
    </section>
  );
}
