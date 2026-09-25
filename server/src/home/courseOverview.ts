import type { Course } from "../db/schema/index.js";
import type { StudyInput } from "./loadInput.js";
import { buildHomeSummary, type CoursePulse, type HomeDeadline, type PlanItem } from "./summary.js";

/**
 * One course's page: the home rules scoped to that course, plus how each of
 * its decks and quizzes is going, and a day-by-day plan once an exam is close.
 * Pure like summary.ts; routes/courseOverview.ts gathers the inputs.
 */

const DAY = 24 * 60 * 60 * 1000;

/** The page switches to exam prep this many days before an exam. */
export const EXAM_PREP_DAYS = 14;
/** How far ahead "Coming up" looks. */
export const UPCOMING_DAYS = 60;
const MAX_UPCOMING = 6;
/** A deck or quiz at or above this is "solid"; below it is on the focus list. */
const SOLID = 0.7;
const MAX_FOCUS = 5;

export type StudySet =
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

export type PrepDay = {
  /** Start of the local day. */
  dayStart: number;
  /** "review" = the day's due cards; the last day before the exam is review only. */
  items: Array<{ kind: "review" } | { kind: "deck" | "quiz"; id: string; title: string }>;
};

export type ExamPrep = {
  exam: HomeDeadline;
  /** Whole local days until the exam's day; 0 = the exam is today. */
  daysLeft: number;
  coverage: { solid: number; shaky: number; untouched: number };
  /** Weakest first. */
  focus: StudySet[];
  days: PrepDay[];
};

export type CourseOverview = {
  generatedAt: number;
  pulse: CoursePulse;
  plan: PlanItem[];
  planMinutes: number;
  upcoming: HomeDeadline[];
  overdue: HomeDeadline[];
  /** Most in need of work first; empty decks last. */
  studySets: StudySet[];
  examPrep: ExamPrep | null;
};

/** `input` holds only this course's data, as loadStudyInput returns it with `courseId`. */
export function buildCourseOverview(course: Course, input: StudyInput): CourseOverview {
  const { now, dayEnd } = input;
  const summary = buildHomeSummary({ ...input, courses: [course] });
  const pulse = summary.courses[0];

  const upcoming: HomeDeadline[] = input.deadlines
    .filter((d) => d.dueAt >= now && d.dueAt < now + UPCOMING_DAYS * DAY)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, MAX_UPCOMING)
    .map((d) => ({
      id: d.id,
      title: d.title,
      dueAt: d.dueAt,
      kind: d.kind,
      courseId: d.courseId ?? undefined,
      source: d.source,
      externalUrl: d.externalUrl ?? undefined,
      readiness: pulse.readiness,
    }));

  const latest = new Map(input.latestQuizResults.map((r) => [r.deckId, r]));
  const studySets: StudySet[] = [
    ...input.cardStats.map(
      (d): StudySet => ({
        kind: "deck",
        id: d.deckId,
        title: d.title,
        mastery: d.total > 0 ? d.mastered / d.total : null,
        total: d.total,
        dueToday: d.dueToday,
        lastStudiedAt: d.lastStudiedAt,
      }),
    ),
    ...input.quizDecks.map((q): StudySet => {
      const r = latest.get(q.id);
      return {
        kind: "quiz",
        id: q.id,
        title: q.title,
        mastery: r && r.totalQuestions > 0 ? r.score / r.totalQuestions : null,
        questionCount: q.questionCount,
        takenAt: r?.completedAt ?? null,
      };
    }),
  ].sort((a, b) => weakness(b) - weakness(a) || a.title.localeCompare(b.title));

  return {
    generatedAt: now,
    pulse,
    plan: summary.plan,
    planMinutes: summary.planMinutes,
    upcoming,
    overdue: summary.runway.overdue,
    studySets,
    examPrep: examPrep(upcoming, studySets, dayEnd),
  };
}

/** Higher = more in need of work. Untouched sets sit in the middle: below clearly weak ones, above ones going fine. */
function weakness(set: StudySet) {
  if (set.kind === "deck" && set.total === 0) return -1;
  if (set.mastery === null || untouched(set)) return 0.5;
  return 1 - set.mastery;
}

function untouched(set: StudySet) {
  return set.kind === "deck" ? set.lastStudiedAt === null && !set.mastery : set.takenAt === null;
}

function examPrep(upcoming: HomeDeadline[], sets: StudySet[], dayEnd: number): ExamPrep | null {
  const today = dayEnd + 1 - DAY;
  const exam = upcoming.find((d) => d.kind === "exam" && d.dueAt < today + EXAM_PREP_DAYS * DAY);
  if (!exam) return null;
  const daysLeft = Math.floor((exam.dueAt - today) / DAY);

  const measurable = sets.filter((s) => !(s.kind === "deck" && s.total === 0));
  const coverage = { solid: 0, shaky: 0, untouched: 0 };
  for (const s of measurable) {
    if (untouched(s)) coverage.untouched++;
    else if ((s.mastery ?? 0) >= SOLID) coverage.solid++;
    else coverage.shaky++;
  }

  // `sets` is already weakest first.
  const focus = measurable.filter((s) => untouched(s) || (s.mastery ?? 0) < SOLID).slice(0, MAX_FOCUS);

  // One focus set a day, weakest first and cycling, with the day's review each day;
  // the day before the exam is review only.
  const days: PrepDay[] = Array.from({ length: daysLeft }, (_, i) => {
    const lastDay = i === daysLeft - 1 && daysLeft > 1;
    const pick = focus.length && !lastDay ? focus[i % focus.length] : null;
    return {
      dayStart: today + i * DAY,
      items: [...(pick ? [{ kind: pick.kind, id: pick.id, title: pick.title }] : []), { kind: "review" as const }],
    };
  });

  return { exam, daysLeft, coverage, focus, days };
}
