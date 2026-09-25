import { describe, expect, it } from "vitest";
import { buildCourseOverview } from "../src/home/courseOverview.js";
import type { StudyInput } from "../src/home/loadInput.js";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 24, 12, 0);
/** Midnight UTC tonight; the tests run in a UTC "local day". */
const DAY_END = Date.UTC(2026, 8, 25) - 1;
const TODAY = DAY_END + 1 - DAY;

const course = { id: "algo", name: "Algorithms", code: "ALG201" };

function input(overrides: Partial<StudyInput> = {}): StudyInput {
  return {
    now: NOW,
    dayEnd: DAY_END,
    deadlines: [],
    cardStats: [],
    quizDecks: [],
    latestQuizResults: [],
    reviews: [],
    noteStats: [],
    activity: [],
    ...overrides,
  };
}

const deadline = (id: string, dueAt: number, kind: "assignment" | "exam" | "event" | "task" = "assignment") => ({
  id,
  title: id,
  dueAt,
  kind,
  courseId: "algo",
  source: "manual",
  externalUrl: null,
});

const deck = (deckId: string, total: number, mastered: number, lastStudiedAt: number | null = NOW - DAY) => ({
  deckId,
  title: deckId,
  courseId: "algo",
  total,
  mastered,
  dueToday: 0,
  lastStudiedAt,
});

describe("buildCourseOverview", () => {
  it("scopes the home rules to the course and looks further ahead for deadlines", () => {
    const overview = buildCourseOverview(
      course,
      input({
        deadlines: [deadline("soon", NOW + 2 * DAY), deadline("later", NOW + 40 * DAY), deadline("late", NOW - DAY)],
      }),
    );
    expect(overview.pulse.courseId).toBe("algo");
    expect(overview.plan.map((p) => p.id)).toEqual(["deadline:late", "deadline:soon"]);
    expect(overview.upcoming.map((d) => d.id)).toEqual(["soon", "later"]);
    expect(overview.overdue.map((d) => d.id)).toEqual(["late"]);
    expect(overview.examPrep).toBeNull();
  });

  it("ranks study sets by how much work they need, empty decks last", () => {
    const overview = buildCourseOverview(
      course,
      input({
        cardStats: [deck("strong", 10, 9), deck("weak", 10, 2), deck("new", 10, 0, null), deck("empty", 0, 0)],
        quizDecks: [{ id: "q", title: "q", courseId: "algo", questionCount: 4, lastTakenAt: NOW - DAY }],
        latestQuizResults: [{ deckId: "q", score: 1, totalQuestions: 4, completedAt: NOW - DAY }],
      }),
    );
    expect(overview.studySets.map((s) => s.id)).toEqual(["weak", "q", "new", "strong", "empty"]);
    expect(overview.studySets[0]).toMatchObject({ kind: "deck", mastery: 0.2 });
    expect(overview.studySets[1]).toMatchObject({ kind: "quiz", mastery: 0.25 });
  });

  it("plans the days up to an exam inside two weeks, weakest sets first and review only on the last day", () => {
    const overview = buildCourseOverview(
      course,
      input({
        deadlines: [deadline("final", TODAY + 4 * DAY + 9 * 3_600_000, "exam")],
        cardStats: [deck("strong", 10, 9), deck("weak", 10, 2), deck("new", 10, 0, null)],
      }),
    );
    const prep = overview.examPrep!;
    expect(prep.exam.id).toBe("final");
    expect(prep.daysLeft).toBe(4);
    expect(prep.coverage).toEqual({ solid: 1, shaky: 1, untouched: 1 });
    expect(prep.focus.map((s) => s.id)).toEqual(["weak", "new"]);
    expect(prep.days.map((d) => d.dayStart)).toEqual([0, 1, 2, 3].map((i) => TODAY + i * DAY));
    expect(prep.days.map((d) => d.items.map((i) => ("id" in i ? i.id : i.kind)))).toEqual([
      ["weak", "review"],
      ["new", "review"],
      ["weak", "review"],
      ["review"],
    ]);
  });

  it("leaves exam prep off for an exam further out, and plans no days for an exam today", () => {
    expect(
      buildCourseOverview(course, input({ deadlines: [deadline("final", TODAY + 20 * DAY, "exam")] })).examPrep,
    ).toBeNull();

    const today = buildCourseOverview(course, input({ deadlines: [deadline("final", NOW + 3_600_000, "exam")] }));
    expect(today.examPrep).toMatchObject({ daysLeft: 0, days: [] });
  });
});
