import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Course } from "@/types";
import type { CourseOverviewDto } from "@/types/api/courseOverview";

let overview: { data?: CourseOverviewDto; isPending: boolean; isError: boolean; refetch: () => void };

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/queries/home/useCourseOverview", () => ({ useCourseOverview: () => overview }));
vi.mock("@/lib/queries/integrations/useBrightspaceStatus", () => ({ useBrightspaceStatus: () => ({ data: undefined }) }));
vi.mock("@/lib/mutations/deadlines/useSetDeadlineCompleted", () => ({
  useSetDeadlineCompleted: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { CourseOverview } from "@/components/dashboard/course/CourseOverview";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 24, 14, 0).getTime();
const TODAY = new Date(2026, 8, 24).getTime();
const course: Course = { id: "algo", name: "Algorithms", code: "ALG201" };

const exam = {
  id: "final",
  title: "Final exam",
  dueAt: TODAY + 3 * DAY + 9 * 3_600_000,
  kind: "exam" as const,
  courseId: "algo",
  source: "brightspace" as const,
  readiness: 0.4,
};

function data(overrides: Partial<CourseOverviewDto> = {}): CourseOverviewDto {
  return {
    generatedAt: NOW,
    pulse: {
      courseId: "algo",
      status: "attention",
      reasons: [],
      readiness: 0.4,
      recall: 0.8,
      recallTrend: [0.6, null, 0.7, 0.8],
      noteCount: 3,
      cardCount: 20,
      dueToday: 5,
      quizCount: 1,
      quizScore: 0.5,
      lastStudiedAt: NOW - DAY,
      nextDeadline: exam,
      overdueCount: 0,
    },
    plan: [],
    planMinutes: 0,
    upcoming: [exam],
    overdue: [],
    studySets: [
      { kind: "deck", id: "heaps", title: "Heaps", mastery: 0.2, total: 10, dueToday: 5, lastStudiedAt: NOW - DAY },
      { kind: "quiz", id: "trees", title: "Trees quiz", mastery: null, questionCount: 8, takenAt: null },
    ],
    examPrep: {
      exam,
      daysLeft: 3,
      coverage: { solid: 0, shaky: 1, untouched: 1 },
      focus: [],
      days: [
        { dayStart: TODAY, items: [{ kind: "deck", id: "heaps", title: "Heaps" }, { kind: "review" }] },
        { dayStart: TODAY + DAY, items: [{ kind: "quiz", id: "trees", title: "Trees quiz" }, { kind: "review" }] },
        { dayStart: TODAY + 2 * DAY, items: [{ kind: "review" }] },
      ],
    },
    lastOpened: { noteId: "n1", title: "Heaps lecture", lastAccessedAt: NOW - 2 * 3_600_000 },
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  overview = { data: data(), isPending: false, isError: false, refetch: vi.fn() };
});
afterEach(cleanup);

describe("CourseOverview", () => {
  it("shows exam prep with a day plan that links each set", () => {
    render(<CourseOverview course={course} />);
    const prep = screen.getByRole("heading", { name: /Final exam in 3 days/ }).closest("section")!;
    const days = within(prep).getAllByRole("listitem");
    expect(days).toHaveLength(3);
    expect(within(days[0]!).getByText("Today")).toBeTruthy();
    expect(within(days[0]!).getByRole("link", { name: "Drill Heaps" }).getAttribute("href")).toBe(
      "/dashboard?view=flashcards&deckId=heaps",
    );
    expect(within(days[1]!).getByRole("link", { name: "Retake Trees quiz" }).getAttribute("href")).toBe(
      "/dashboard?view=quizzes&deckId=trees",
    );
    expect(within(prep).getByRole("img", { name: "0 solid, 1 shaky, 1 not started" })).toBeTruthy();
  });

  it("hides exam prep for that exam and remembers it", () => {
    render(<CourseOverview course={course} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide exam prep" }));
    expect(screen.queryByRole("heading", { name: /Final exam in 3 days/ })).toBeNull();
    cleanup();

    render(<CourseOverview course={course} />);
    expect(screen.queryByRole("heading", { name: /Final exam in 3 days/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show it" }));
    expect(screen.getByRole("heading", { name: /Final exam in 3 days/ })).toBeTruthy();
  });

  it("lists study sets weakest first with their mastery and actions", () => {
    render(<CourseOverview course={course} />);
    const table = screen.getByRole("heading", { name: "What needs work, weakest first" }).closest("section")!;
    expect(within(table).getByRole("meter", { name: "Heaps mastery" }).getAttribute("aria-valuenow")).toBe("20");
    expect(within(table).getByText("Not measured yet")).toBeTruthy();
    expect(within(table).getByRole("link", { name: "Review Heaps" })).toBeTruthy();
    expect(within(table).getByRole("link", { name: "Take Trees quiz" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Heaps lecture" }).getAttribute("href")).toBe("/dashboard?noteId=n1");
  });

  it("leaves exam prep out when no exam is close", () => {
    overview.data = data({ examPrep: null });
    render(<CourseOverview course={course} />);
    expect(screen.queryByText("Exam prep")).toBeNull();
    expect(screen.getByText("Readiness")).toBeTruthy();
  });

  it("offers a retry when loading fails", () => {
    overview = { data: undefined, isPending: false, isError: true, refetch: vi.fn() };
    render(<CourseOverview course={course} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(overview.refetch).toHaveBeenCalled();
  });
});
