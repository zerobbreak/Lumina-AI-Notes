import { describe, expect, it } from "vitest";
import { buildHomeSummary, type HomeInput } from "../src/home/summary.js";
import { localDayEnd } from "../src/routes/home.js";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 24, 12, 0);

const course = (id: string) => ({ id, name: id, code: id.toUpperCase() });

function input(overrides: Partial<HomeInput> = {}): HomeInput {
  return {
    now: NOW,
    dayEnd: NOW + 12 * 3_600_000,
    courses: [course("prog"), course("data")],
    deadlines: [],
    cardStats: [],
    quizDecks: [],
    latestQuizResults: [],
    reviews: [],
    noteStats: [],
    ...overrides,
  };
}

const deadline = (id: string, dueAt: number, extra: Partial<HomeInput["deadlines"][number]> = {}) => ({
  id,
  title: id,
  dueAt,
  kind: "assignment" as const,
  courseId: "prog",
  source: "manual",
  externalUrl: null,
  ...extra,
});

describe("buildHomeSummary plan", () => {
  it("puts an overdue deadline above everything else", () => {
    const summary = buildHomeSummary(
      input({
        deadlines: [deadline("late", NOW - 2 * DAY), deadline("tomorrow", NOW + DAY)],
        cardStats: [{ deckId: "d", courseId: "prog", total: 40, mastered: 0, dueToday: 40, lastStudiedAt: null }],
      }),
    );
    expect(summary.plan.map((p) => p.id)).toEqual(["deadline:late", "deadline:tomorrow", "review"]);
  });

  it("ranks a sooner deadline above a later one and skips events", () => {
    const summary = buildHomeSummary(
      input({
        deadlines: [
          deadline("friday", NOW + 5 * DAY),
          deadline("tomorrow", NOW + DAY),
          deadline("lecture", NOW + DAY, { kind: "event" }),
        ],
      }),
    );
    expect(summary.plan.map((p) => p.id)).toEqual(["deadline:tomorrow", "deadline:friday"]);
  });

  it("leaves deadlines more than a week out off the plan but on the runway", () => {
    const summary = buildHomeSummary(input({ deadlines: [deadline("later", NOW + 10 * DAY)] }));
    expect(summary.plan).toEqual([]);
    expect(summary.runway.deadlines.map((d) => d.id)).toEqual(["later"]);
  });

  it("groups due cards by course and flags the course with a deadline this week", () => {
    const summary = buildHomeSummary(
      input({
        deadlines: [deadline("test", NOW + 3 * DAY, { courseId: "data", kind: "exam" })],
        cardStats: [
          { deckId: "a", courseId: "prog", total: 30, mastered: 10, dueToday: 20, lastStudiedAt: null },
          { deckId: "b", courseId: "data", total: 20, mastered: 5, dueToday: 12, lastStudiedAt: null },
        ],
      }),
    );
    const review = summary.plan.find((p) => p.kind === "review");
    expect(review).toMatchObject({
      dueCount: 32,
      byCourse: [
        { courseId: "prog", count: 20 },
        { courseId: "data", count: 12 },
      ],
      urgentCourseId: "data",
      minutes: 13,
    });
  });

  it("suggests retaking a recent quiz scored under 60%, not an old or passed one", () => {
    const quiz = (id: string) => ({ id, title: id, courseId: "data", questionCount: 12, lastTakenAt: null });
    const summary = buildHomeSummary(
      input({
        quizDecks: [quiz("weak"), quiz("passed"), quiz("old")],
        latestQuizResults: [
          { deckId: "weak", score: 5, totalQuestions: 12, completedAt: NOW - 3 * DAY },
          { deckId: "passed", score: 10, totalQuestions: 12, completedAt: NOW - 3 * DAY },
          { deckId: "old", score: 2, totalQuestions: 12, completedAt: NOW - 40 * DAY },
        ],
      }),
    );
    expect(summary.plan).toEqual([expect.objectContaining({ kind: "weak-quiz", quizDeckId: "weak", scorePercent: 42, minutes: 9 })]);
  });

  it("keeps the plan to four items and totals their minutes", () => {
    const summary = buildHomeSummary(
      input({ deadlines: [1, 2, 3, 4, 5].map((n) => deadline(`d${n}`, NOW + n * DAY)) }),
    );
    expect(summary.plan).toHaveLength(4);
    expect(summary.planMinutes).toBe(4 * 45);
  });
});

describe("buildHomeSummary course pulse", () => {
  it("blends card mastery and quiz scores into readiness", () => {
    const summary = buildHomeSummary(
      input({
        cardStats: [{ deckId: "a", courseId: "prog", total: 10, mastered: 5, dueToday: 0, lastStudiedAt: NOW }],
        quizDecks: [{ id: "q", title: "q", courseId: "prog", questionCount: 10, lastTakenAt: NOW }],
        latestQuizResults: [{ deckId: "q", score: 10, totalQuestions: 10, completedAt: NOW - DAY }],
      }),
    );
    expect(summary.courses.find((c) => c.courseId === "prog")?.readiness).toBeCloseTo(0.6 * 0.5 + 0.4 * 1);
    expect(summary.courses.find((c) => c.courseId === "data")?.readiness).toBeNull();
  });

  it("marks a course behind when it has an overdue deadline", () => {
    const summary = buildHomeSummary(input({ deadlines: [deadline("late", NOW - DAY)] }));
    const prog = summary.courses[0];
    expect(prog).toMatchObject({ courseId: "prog", status: "behind", overdueCount: 1 });
    expect(prog.reasons[0]).toBe("overdue");
  });

  it("marks a course behind when a deadline is close and readiness is low", () => {
    const summary = buildHomeSummary(
      input({
        deadlines: [deadline("soon", NOW + 2 * DAY)],
        cardStats: [{ deckId: "a", courseId: "prog", total: 10, mastered: 2, dueToday: 0, lastStudiedAt: NOW }],
      }),
    );
    expect(summary.courses[0]).toMatchObject({ courseId: "prog", status: "behind", reasons: ["low-readiness"] });
  });

  it("marks a course quiet after two weeks without study", () => {
    const summary = buildHomeSummary(
      input({ noteStats: [{ courseId: "data", count: 3, lastUpdatedAt: NOW - 20 * DAY }] }),
    );
    expect(summary.courses.find((c) => c.courseId === "data")).toMatchObject({ status: "quiet", noteCount: 3 });
  });

  it("computes recall from reviews not rated hard, week by week", () => {
    const reviews = [
      ...Array.from({ length: 4 }, (_, i) => ({ deckId: "a", rating: "easy", reviewedAt: NOW - DAY - i })),
      { deckId: "a", rating: "hard", reviewedAt: NOW - DAY },
      // Two in an older week: too few to plot.
      { deckId: "a", rating: "easy", reviewedAt: NOW - 20 * DAY },
      { deckId: "a", rating: "hard", reviewedAt: NOW - 20 * DAY },
    ];
    const summary = buildHomeSummary(
      input({
        cardStats: [{ deckId: "a", courseId: "prog", total: 5, mastered: 5, dueToday: 0, lastStudiedAt: NOW }],
        reviews,
      }),
    );
    const prog = summary.courses.find((c) => c.courseId === "prog")!;
    expect(prog.recall).toBeCloseTo(5 / 7);
    expect(prog.recallTrend).toHaveLength(8);
    expect(prog.recallTrend[7]).toBeCloseTo(0.8);
    expect(prog.recallTrend[5]).toBeNull();
  });

  it("sorts courses by status, then by next deadline", () => {
    const summary = buildHomeSummary(
      input({
        courses: [course("a"), course("b"), course("c")],
        deadlines: [deadline("late", NOW - DAY, { courseId: "c" })],
        noteStats: [
          { courseId: "a", count: 1, lastUpdatedAt: NOW },
          { courseId: "b", count: 1, lastUpdatedAt: NOW - 30 * DAY },
        ],
      }),
    );
    expect(summary.courses.map((c) => [c.courseId, c.status])).toEqual([
      ["c", "behind"],
      ["b", "quiet"],
      ["a", "on-track"],
    ]);
  });
});

describe("localDayEnd", () => {
  it("ends the day at local midnight for a zone east of UTC", () => {
    // 23:30 UTC is already 01:30 the next day in UTC+2 (offset -120).
    const now = Date.UTC(2026, 8, 24, 23, 30);
    expect(localDayEnd(now, -120)).toBe(Date.UTC(2026, 8, 25, 21, 59, 59, 999));
  });

  it("ends the day at local midnight for a zone west of UTC", () => {
    const now = Date.UTC(2026, 8, 24, 12, 0);
    expect(localDayEnd(now, 300)).toBe(Date.UTC(2026, 8, 25, 4, 59, 59, 999));
  });
});
