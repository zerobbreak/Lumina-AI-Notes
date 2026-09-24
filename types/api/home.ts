/** Mirrors server/src/home/summary.ts: GET /api/v1/home. */

export type HomeDeadlineKind = "assignment" | "exam" | "event" | "task";

export type HomeDeadlineDto = {
  id: string;
  title: string;
  dueAt: number;
  kind: HomeDeadlineKind;
  courseId?: string;
  source: "manual" | "brightspace";
  externalUrl?: string;
  /** 0–1 readiness of the deadline's course; null when nothing is linked to measure. */
  readiness: number | null;
};

export type PlanItemDto =
  | { kind: "overdue" | "deadline"; id: string; score: number; minutes: number; deadline: HomeDeadlineDto }
  | {
      kind: "review";
      id: "review";
      score: number;
      minutes: number;
      dueCount: number;
      byCourse: Array<{ courseId: string | null; count: number }>;
      urgentCourseId?: string;
    }
  | {
      kind: "weak-quiz";
      id: string;
      score: number;
      minutes: number;
      quizDeckId: string;
      title: string;
      courseId?: string;
      scorePercent: number;
      takenAt: number;
    };

export type PulseStatus = "behind" | "attention" | "quiet" | "on-track";
export type PulseReason = "overdue" | "low-readiness" | "deadline-soon" | "low-recall" | "quiet";

export type CoursePulseDto = {
  courseId: string;
  status: PulseStatus;
  reasons: PulseReason[];
  readiness: number | null;
  recall: number | null;
  /** Oldest week first. */
  recallTrend: Array<number | null>;
  noteCount: number;
  cardCount: number;
  dueToday: number;
  quizCount: number;
  /** Average latest score across the course's quizzes, 0–1. */
  quizScore: number | null;
  lastStudiedAt: number | null;
  nextDeadline: HomeDeadlineDto | null;
  overdueCount: number;
};

export type HomeResumeDto = {
  noteId: string;
  title: string;
  preview: string;
  courseId?: string;
  moduleId?: string;
  lastAccessedAt: number;
};

export type HomeSummaryDto = {
  generatedAt: number;
  plan: PlanItemDto[];
  planMinutes: number;
  runway: { start: number; days: number; deadlines: HomeDeadlineDto[]; overdue: HomeDeadlineDto[] };
  courses: CoursePulseDto[];
  /** One flag per local day, oldest first; the last is today. */
  studyDays: boolean[];
  resume: HomeResumeDto | null;
};
