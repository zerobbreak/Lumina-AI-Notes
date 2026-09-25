import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";

let deadlines: DeadlineModel[] = [];
const setCompleted = vi.fn();
const rangeCalls: Array<{ startMs: number; endMs: number }> = [];

vi.mock("@/lib/queries/calendar/useCalendarActivity", () => ({
  useCalendarActivity: () => ({ data: { recordings: [], notes: [] }, isLoading: false }),
}));
vi.mock("@/lib/queries/deadlines/useDeadlinesInRange", () => ({
  useDeadlinesInRange: (params: { startMs: number; endMs: number }) => {
    rangeCalls.push(params);
    return { data: deadlines, isLoading: false };
  },
}));
vi.mock("@/lib/queries/users/useCurrentUser", () => ({
  useCurrentUser: () => ({ data: { courses: [{ id: "c-prog", name: "Programming 3B", code: "PROG7312" }] } }),
}));
vi.mock("@/lib/queries/users/useGamification", () => ({
  useGamification: () => ({ data: { currentStreak: 1, longestStreak: 1 } }),
}));
vi.mock("@/lib/queries/home/useHomeSummary", () => ({
  useHomeSummary: () => ({ data: undefined }),
}));
vi.mock("@/lib/queries/integrations/useBrightspaceStatus", () => ({
  useBrightspaceStatus: () => ({ data: { connected: false } }),
}));
vi.mock("@/lib/mutations/deadlines/useCreateDeadline", () => ({
  useCreateDeadline: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/mutations/deadlines/useSetDeadlineCompleted", () => ({
  useSetDeadlineCompleted: () => ({ mutate: setCompleted, isPending: false }),
}));

import CalendarView from "@/components/dashboard/views/CalendarView";

const today = new Date();
const at = (hours: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, 0).getTime();

const deadline = (overrides: Partial<DeadlineModel>): DeadlineModel => ({
  _id: "d",
  userId: "u",
  title: "Deadline",
  dueAt: at(23),
  kind: "assignment",
  source: "manual",
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

beforeEach(() => {
  setCompleted.mockReset();
  rangeCalls.length = 0;
  deadlines = [];
});
afterEach(cleanup);

describe("CalendarView deadlines", () => {
  it("asks for every day the month grid shows", () => {
    render(<CalendarView />);
    const { startMs, endMs } = rangeCalls.at(-1)!;
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    expect(new Date(startMs)).toEqual(new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay()));
    expect(new Date(startMs).getDay()).toBe(0);
    expect(new Date(endMs).getDay()).toBe(6);
    expect(endMs).toBeGreaterThanOrEqual(new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59).getTime());
  });

  it("shows the day's deadline titles in the grid", () => {
    deadlines = [deadline({ _id: "essay", title: "Essay draft", courseId: "c-prog" })];
    render(<CalendarView />);
    const cell = screen.getByRole("button", { pressed: true, name: /1 due/ });
    expect(cell).toHaveTextContent("Essay draft");
  });

  it("hides a module's deadlines when its filter is switched off", () => {
    deadlines = [deadline({ _id: "essay", title: "Essay draft", courseId: "c-prog" })];
    render(<CalendarView />);
    fireEvent.click(screen.getByRole("button", { name: "PROG7312" }));
    expect(screen.queryByText("Essay draft")).not.toBeInTheDocument();
  });

  it("lists the selected day's deadlines with course and Brightspace link", () => {
    deadlines = [
      deadline({
        _id: "ice5",
        title: "ICE Task 5 - Photostore Frontend",
        courseId: "c-prog",
        source: "brightspace",
        externalUrl: "https://mystudies.example/d2l/le/calendar/1/event/2/detailsview",
      }),
    ];
    render(<CalendarView />);

    expect(screen.getByText("Due")).toBeInTheDocument();
    // Once in its grid cell, once in the day panel.
    expect(screen.getAllByText("ICE Task 5 - Photostore Frontend")).toHaveLength(2);
    expect(screen.getByText("PROG7312 · Programming 3B")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Brightspace/ })).toHaveAttribute("target", "_blank");
    expect(screen.queryByText(/Nothing due/)).not.toBeInTheDocument();
  });

  it("ticks a deadline off, and reopens a finished one", () => {
    deadlines = [
      deadline({ _id: "open", title: "Essay" }),
      deadline({ _id: "done", title: "Lab", completedAt: at(9) }),
    ];
    render(<CalendarView />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Essay done" }));
    expect(setCompleted).toHaveBeenCalledWith({ id: "open", completed: true }, expect.anything());

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Lab not done" }));
    expect(setCompleted).toHaveBeenCalledWith({ id: "done", completed: false }, expect.anything());
  });

  it("says so when a day has nothing", () => {
    render(<CalendarView />);
    expect(screen.getByText("Nothing due and no activity on this day.")).toBeInTheDocument();
  });
});
