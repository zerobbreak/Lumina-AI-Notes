import type { Course } from "../db/schema/index.js";

/**
 * The home page's "what next" model: a ranked plan for today, the next two
 * weeks of deadlines, and how each course is going. Pure so the rules can be
 * tested without a database; routes/home.ts gathers the inputs.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export const RUNWAY_DAYS = 14;
export const PLAN_SIZE = 4;
export const TREND_WEEKS = 8;

type DeadlineKind = "assignment" | "exam" | "event" | "task";

export type HomeInput = {
  now: number;
  /** Last millisecond of the user's local day; cards due by then count as due today. */
  dayEnd: number;
  courses: Course[];
  /** Unfinished deadlines due within RUNWAY_DAYS either side of now. */
  deadlines: Array<{
    id: string;
    title: string;
    dueAt: number;
    kind: DeadlineKind;
    courseId: string | null;
    source: string;
    externalUrl: string | null;
  }>;
  /** Per flashcard deck. `mastered` = seen twice or more and not due yet. */
  cardStats: Array<{ deckId: string; courseId: string | null; total: number; mastered: number; dueToday: number; lastStudiedAt: number | null }>;
  quizDecks: Array<{ id: string; title: string; courseId: string | null; questionCount: number; lastTakenAt: number | null }>;
  /** Most recent result per quiz deck. */
  latestQuizResults: Array<{ deckId: string; score: number; totalQuestions: number; completedAt: number }>;
  /** Flashcard reviews from the last TREND_WEEKS weeks. */
  reviews: Array<{ deckId: string; rating: string; reviewedAt: number }>;
  noteStats: Array<{ courseId: string; count: number; lastUpdatedAt: number | null }>;
};

export type HomeDeadline = {
  id: string;
  title: string;
  dueAt: number;
  kind: DeadlineKind;
  courseId?: string;
  source: string;
  externalUrl?: string;
  /** 0–1 readiness of the deadline's course; null when nothing is linked to measure. */
  readiness: number | null;
};

export type PlanItem =
  | { kind: "overdue" | "deadline"; id: string; score: number; minutes: number; deadline: HomeDeadline }
  | {
      kind: "review";
      id: "review";
      score: number;
      minutes: number;
      dueCount: number;
      byCourse: Array<{ courseId: string | null; count: number }>;
      /** The course with a deadline inside a week whose cards are part of today's review. */
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

export type CoursePulse = {
  courseId: string;
  status: PulseStatus;
  /** Most important first. */
  reasons: PulseReason[];
  readiness: number | null;
  /** Share of reviews in the last 4 weeks not rated "hard"; null with too few reviews. */
  recall: number | null;
  /** Oldest week first, one value per week; null for weeks with too few reviews. */
  recallTrend: Array<number | null>;
  noteCount: number;
  cardCount: number;
  dueToday: number;
  lastStudiedAt: number | null;
  nextDeadline: HomeDeadline | null;
  overdueCount: number;
};

export type HomeSummary = {
  generatedAt: number;
  plan: PlanItem[];
  planMinutes: number;
  runway: { start: number; days: number; deadlines: HomeDeadline[]; overdue: HomeDeadline[] };
  courses: CoursePulse[];
};

const MIN_RECALL_REVIEWS = 5;
const MIN_WEEK_REVIEWS = 3;
const WEAK_QUIZ_PERCENT = 60;
const WEAK_QUIZ_WINDOW = 30 * DAY;
const QUIET_AFTER = 14 * DAY;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const recallOf = (ratings: string[]) => ratings.filter((r) => r !== "hard").length / ratings.length;

/** Blend of flashcard mastery and recent quiz scores for one course. */
function courseReadiness(courseId: string, input: HomeInput): number | null {
  const decks = input.cardStats.filter((d) => d.courseId === courseId);
  const total = decks.reduce((n, d) => n + d.total, 0);
  const cardSignal = total > 0 ? decks.reduce((n, d) => n + d.mastered, 0) / total : null;

  const quizIds = new Set(input.quizDecks.filter((q) => q.courseId === courseId).map((q) => q.id));
  const scores = input.latestQuizResults
    .filter((r) => quizIds.has(r.deckId) && r.totalQuestions > 0 && input.now - r.completedAt <= 60 * DAY)
    .map((r) => r.score / r.totalQuestions);
  const quizSignal = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  if (cardSignal !== null && quizSignal !== null) return 0.6 * cardSignal + 0.4 * quizSignal;
  return cardSignal ?? quizSignal;
}

export function buildHomeSummary(input: HomeInput): HomeSummary {
  const { now } = input;
  const readiness = new Map<string, number | null>();
  const readinessFor = (courseId: string | null) => {
    if (!courseId) return null;
    if (!readiness.has(courseId)) readiness.set(courseId, courseReadiness(courseId, input));
    return readiness.get(courseId) ?? null;
  };

  const toHome = (d: HomeInput["deadlines"][number]): HomeDeadline => ({
    id: d.id,
    title: d.title,
    dueAt: d.dueAt,
    kind: d.kind,
    courseId: d.courseId ?? undefined,
    source: d.source,
    externalUrl: d.externalUrl ?? undefined,
    readiness: readinessFor(d.courseId),
  });

  const sorted = [...input.deadlines].sort((a, b) => a.dueAt - b.dueAt);
  const upcoming = sorted.filter((d) => d.dueAt >= now && d.dueAt < now + RUNWAY_DAYS * DAY).map(toHome);
  const overdue = sorted.filter((d) => d.dueAt < now && d.dueAt >= now - RUNWAY_DAYS * DAY).map(toHome).reverse();
  const soonCourses = new Set(
    upcoming.filter((d) => d.courseId && d.kind !== "event" && d.dueAt - now <= WEEK).map((d) => d.courseId!),
  );

  // ---- plan ----
  const candidates: PlanItem[] = [];

  for (const d of overdue) {
    if (d.kind === "event") continue;
    const daysLate = (now - d.dueAt) / DAY;
    candidates.push({ kind: "overdue", id: `deadline:${d.id}`, score: 100 - Math.min(daysLate, 10), minutes: d.kind === "task" ? 20 : 45, deadline: d });
  }

  for (const d of upcoming) {
    if (d.kind === "event" || d.dueAt - now > WEEK) continue;
    const daysLeft = (d.dueAt - now) / DAY;
    const base = d.kind === "assignment" ? 90 : d.kind === "exam" ? 85 : 70;
    const gap = 1 - (d.readiness ?? 0.5);
    candidates.push({
      kind: "deadline",
      id: `deadline:${d.id}`,
      score: base - daysLeft * 8 + gap * 15,
      minutes: d.kind === "assignment" ? 45 : d.kind === "exam" ? 30 : 20,
      deadline: d,
    });
  }

  const dueByCourse = new Map<string | null, number>();
  for (const s of input.cardStats) {
    if (s.dueToday > 0) dueByCourse.set(s.courseId, (dueByCourse.get(s.courseId) ?? 0) + s.dueToday);
  }
  const dueCount = [...dueByCourse.values()].reduce((a, b) => a + b, 0);
  if (dueCount > 0) {
    const byCourse = [...dueByCourse.entries()]
      .map(([courseId, count]) => ({ courseId, count }))
      .sort((a, b) => b.count - a.count);
    const urgent = byCourse.find((c) => c.courseId && soonCourses.has(c.courseId));
    candidates.push({
      kind: "review",
      id: "review",
      score: 45 + Math.min(dueCount, 50) * 0.4 + (urgent ? 15 : 0),
      // About 25 seconds a card.
      minutes: clamp(Math.ceil(dueCount * 0.4), 5, 30),
      dueCount,
      byCourse,
      urgentCourseId: urgent?.courseId ?? undefined,
    });
  }

  const quizById = new Map(input.quizDecks.map((q) => [q.id, q]));
  for (const r of input.latestQuizResults) {
    const quiz = quizById.get(r.deckId);
    if (!quiz || r.totalQuestions <= 0 || now - r.completedAt > WEAK_QUIZ_WINDOW) continue;
    const percent = Math.round((r.score / r.totalQuestions) * 100);
    if (percent >= WEAK_QUIZ_PERCENT) continue;
    candidates.push({
      kind: "weak-quiz",
      id: `quiz:${quiz.id}`,
      score: 40 + (WEAK_QUIZ_PERCENT - percent) * 0.5 + (quiz.courseId && soonCourses.has(quiz.courseId) ? 15 : 0),
      minutes: clamp(Math.ceil(quiz.questionCount * 0.75), 5, 20),
      quizDeckId: quiz.id,
      title: quiz.title,
      courseId: quiz.courseId ?? undefined,
      scorePercent: percent,
      takenAt: r.completedAt,
    });
  }

  const plan = candidates.sort((a, b) => b.score - a.score).slice(0, PLAN_SIZE);

  // ---- course pulse ----
  const deckCourse = new Map(input.cardStats.map((d) => [d.deckId, d.courseId]));
  const trendStart = now - TREND_WEEKS * WEEK;

  const courses = input.courses.map((course): CoursePulse => {
    const decks = input.cardStats.filter((d) => d.courseId === course.id);
    const reviews = input.reviews.filter((r) => deckCourse.get(r.deckId) === course.id);
    const recent = reviews.filter((r) => r.reviewedAt >= now - 4 * WEEK).map((r) => r.rating);
    const recall = recent.length >= MIN_RECALL_REVIEWS ? recallOf(recent) : null;

    const recallTrend = Array.from({ length: TREND_WEEKS }, (_, week) => {
      const from = trendStart + week * WEEK;
      const ratings = reviews.filter((r) => r.reviewedAt >= from && r.reviewedAt < from + WEEK).map((r) => r.rating);
      return ratings.length >= MIN_WEEK_REVIEWS ? recallOf(ratings) : null;
    });

    const notes = input.noteStats.find((n) => n.courseId === course.id);
    const quizzes = input.quizDecks.filter((q) => q.courseId === course.id);
    const lastStudiedAt = Math.max(
      notes?.lastUpdatedAt ?? 0,
      ...decks.map((d) => d.lastStudiedAt ?? 0),
      ...quizzes.map((q) => q.lastTakenAt ?? 0),
      ...reviews.map((r) => r.reviewedAt),
    ) || null;

    const courseReady = readinessFor(course.id);
    const nextDeadline = upcoming.find((d) => d.courseId === course.id && d.kind !== "event") ?? null;
    const overdueCount = overdue.filter((d) => d.courseId === course.id && d.kind !== "event").length;
    const soon = nextDeadline !== null && nextDeadline.dueAt - now <= WEEK;

    const reasons: PulseReason[] = [];
    if (overdueCount > 0) reasons.push("overdue");
    if (soon && courseReady !== null && courseReady < 0.65) reasons.push("low-readiness");
    else if (soon) reasons.push("deadline-soon");
    if (recall !== null && recall < 0.5) reasons.push("low-recall");
    if (lastStudiedAt === null || now - lastStudiedAt > QUIET_AFTER) reasons.push("quiet");

    let status: PulseStatus = "on-track";
    if (overdueCount > 0 || (soon && courseReady !== null && courseReady < 0.4)) status = "behind";
    else if ((soon && (courseReady === null || courseReady < 0.65)) || (recall !== null && recall < 0.5)) status = "attention";
    else if (reasons.includes("quiet")) status = "quiet";

    return {
      courseId: course.id,
      status,
      reasons,
      readiness: courseReady,
      recall,
      recallTrend,
      noteCount: notes?.count ?? 0,
      cardCount: decks.reduce((n, d) => n + d.total, 0),
      dueToday: decks.reduce((n, d) => n + d.dueToday, 0),
      lastStudiedAt,
      nextDeadline,
      overdueCount,
    };
  });

  const rank: Record<PulseStatus, number> = { behind: 0, attention: 1, quiet: 2, "on-track": 3 };
  courses.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (a.nextDeadline?.dueAt ?? Infinity) - (b.nextDeadline?.dueAt ?? Infinity),
  );

  return {
    generatedAt: now,
    plan,
    planMinutes: plan.reduce((n, p) => n + p.minutes, 0),
    runway: { start: now, days: RUNWAY_DAYS, deadlines: upcoming, overdue },
    courses,
  };
}
