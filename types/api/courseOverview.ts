/** Mirrors server/src/home/courseOverview.ts: GET /api/v1/courses/:courseId/overview. */

import type { CoursePulseDto, HomeDeadlineDto, PlanItemDto } from "./home";

export type StudySetDto =
  | {
      kind: "deck";
      id: string;
      title: string;
      /** Share of cards seen twice or more and not due; null for an empty deck. */
      mastery: number | null;
      total: number;
      dueToday: number;
      lastStudiedAt: number | null;
    }
  | {
      kind: "quiz";
      id: string;
      title: string;
      /** Latest score, 0–1; null when never taken. */
      mastery: number | null;
      questionCount: number;
      takenAt: number | null;
    };

export type PrepDayDto = {
  /** Start of the local day. */
  dayStart: number;
  /** "review" = the day's due cards; the last day before the exam is review only. */
  items: Array<{ kind: "review" } | { kind: "deck" | "quiz"; id: string; title: string }>;
};

export type ExamPrepDto = {
  exam: HomeDeadlineDto;
  /** Whole local days until the exam's day; 0 = the exam is today. */
  daysLeft: number;
  coverage: { solid: number; shaky: number; untouched: number };
  /** Weakest first. */
  focus: StudySetDto[];
  days: PrepDayDto[];
};

export type CourseOverviewDto = {
  generatedAt: number;
  pulse: CoursePulseDto;
  plan: PlanItemDto[];
  planMinutes: number;
  /** The next 60 days, soonest first, at most 6. */
  upcoming: HomeDeadlineDto[];
  overdue: HomeDeadlineDto[];
  /** Most in need of work first; empty decks last. */
  studySets: StudySetDto[];
  /** Set from 14 days before an exam. */
  examPrep: ExamPrepDto | null;
  lastOpened: { noteId: string; title: string; lastAccessedAt: number } | null;
};
