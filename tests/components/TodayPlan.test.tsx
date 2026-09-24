import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Course } from "@/types";
import type { CoursePulseDto, PlanItemDto } from "@/types/api/home";

const setCompleted = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/mutations/deadlines/useSetDeadlineCompleted", () => ({
  useSetDeadlineCompleted: () => ({ mutate: setCompleted, isPending: false }),
}));

import { TodayPlan } from "@/components/dashboard/home/TodayPlan";

const HOUR = 3_600_000;
const NOW = new Date(2026, 8, 24, 14, 0).getTime();

const courses: Course[] = [
  { id: "prog", name: "Programming 2B", code: "PROG6212" },
  { id: "data", name: "Database Systems", code: "DATA6211" },
];
const courseOf = (id: string | null | undefined) => courses.find((c) => c.id === id);

const pulse = (courseId: string, nextDeadline: CoursePulseDto["nextDeadline"]): CoursePulseDto => ({
  courseId,
  status: "attention",
  reasons: [],
  readiness: null,
  recall: null,
  recallTrend: [],
  noteCount: 0,
  cardCount: 0,
  dueToday: 0,
  lastStudiedAt: null,
  nextDeadline,
  overdueCount: 0,
});

const classTest = {
  id: "ct2",
  title: "Class test 2",
  dueAt: new Date(2026, 8, 29, 9, 0).getTime(),
  kind: "exam" as const,
  courseId: "data",
  source: "manual" as const,
  readiness: 0.62,
};

const plan: PlanItemDto[] = [
  {
    kind: "overdue",
    id: "deadline:refl",
    score: 99,
    minutes: 45,
    deadline: {
      id: "refl",
      title: "Reading reflection 4",
      dueAt: NOW - 50 * HOUR,
      kind: "assignment",
      courseId: "prog",
      source: "brightspace",
      externalUrl: "https://lms.example.test/d2l/le/1",
      readiness: null,
    },
  },
  { kind: "deadline", id: "deadline:ct2", score: 80, minutes: 30, deadline: classTest },
  {
    kind: "review",
    id: "review",
    score: 60,
    minutes: 14,
    dueCount: 34,
    byCourse: [
      { courseId: "prog", count: 22 },
      { courseId: "data", count: 12 },
    ],
    urgentCourseId: "data",
  },
  {
    kind: "weak-quiz",
    id: "quiz:norm",
    score: 55,
    minutes: 9,
    quizDeckId: "norm",
    title: "Normalisation",
    courseId: "data",
    scorePercent: 48,
    takenAt: NOW - 6 * 24 * HOUR,
  },
];

const renderPlan = (items = plan) =>
  render(
    <TodayPlan
      plan={items}
      planMinutes={items.reduce((n, p) => n + p.minutes, 0)}
      pulses={[pulse("data", classTest)]}
      courseOf={courseOf}
      now={NOW}
    />,
  );

beforeEach(() => setCompleted.mockReset());
afterEach(cleanup);

describe("TodayPlan", () => {
  it("lists the plan in order with what each item needs", () => {
    renderPlan();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Reading reflection 4", "Class test 2", "Review 34 flashcards", "Retake Normalisation"]);

    expect(screen.getByText("2 days overdue")).toBeTruthy();
    expect(screen.getByText(/about 62% ready/)).toBeTruthy();
    expect(screen.getByText(/12 of them are DATA6211, ahead of Class test 2/)).toBeTruthy();
    expect(screen.getByText(/You scored 48% 6 days ago/)).toBeTruthy();
    expect(screen.getByText(/4 items, about 1 hr 38 min/)).toBeTruthy();
  });

  it("links each item to where the work happens", () => {
    renderPlan();
    expect(screen.getByRole("link", { name: /Brightspace/ }).getAttribute("href")).toBe(
      "https://lms.example.test/d2l/le/1",
    );
    expect(screen.getByRole("link", { name: "Open course" }).getAttribute("href")).toBe(
      "/dashboard?contextId=data&contextType=course",
    );
    expect(screen.getByRole("link", { name: "Start review" }).getAttribute("href")).toBe("/dashboard?view=flashcards");
    expect(screen.getByRole("link", { name: "Retake" }).getAttribute("href")).toBe(
      "/dashboard?view=quizzes&deckId=norm",
    );
  });

  it("marks a deadline done, and only deadlines get a checkbox", () => {
    renderPlan();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Class test 2 done" }));
    expect(setCompleted).toHaveBeenCalledWith({ id: "ct2", completed: true }, expect.anything());
  });

  it("says so when there's nothing to do", () => {
    renderPlan([]);
    expect(screen.getByText("You're clear for today.")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
