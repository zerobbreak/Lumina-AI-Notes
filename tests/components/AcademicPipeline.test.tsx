import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeadlineModel } from "@/lib/api/adapters/deadline";
import type { BrightspaceStatusDto } from "@/types/api/integrations";

const HOUR = 3_600_000;
let upcoming: DeadlineModel[] | undefined;
let overdue: DeadlineModel[] | undefined;
let brightspace: BrightspaceStatusDto | undefined;
const setCompleted = vi.fn();
const dispatchAppCommand = vi.fn();

vi.mock("@/lib/queries/deadlines/useUpcomingDeadlines", () => ({
  useUpcomingDeadlines: () => ({ data: upcoming }),
}));
vi.mock("@/lib/queries/deadlines/useOverdueDeadlines", () => ({
  useOverdueDeadlines: () => ({ data: overdue }),
}));
vi.mock("@/lib/queries/integrations/useBrightspaceStatus", () => ({
  useBrightspaceStatus: () => ({ data: brightspace }),
}));
vi.mock("@/lib/mutations/deadlines/useSetDeadlineCompleted", () => ({
  useSetDeadlineCompleted: () => ({ mutate: setCompleted, isPending: false }),
}));
vi.mock("@/lib/hooks/mutations/useDeadlineActions", () => ({
  useDeadlineActions: () => ({ createDeadline: vi.fn() }),
}));
vi.mock("@/lib/appCommands", () => ({ dispatchAppCommand: (id: string) => dispatchAppCommand(id) }));

import { AcademicPipeline } from "@/components/dashboard/home/AcademicPipeline";

const deadline = (overrides: Partial<DeadlineModel>): DeadlineModel => ({
  _id: "d",
  userId: "u",
  title: "Deadline",
  dueAt: Date.now() + 48 * HOUR,
  kind: "assignment",
  source: "manual",
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

beforeEach(() => {
  setCompleted.mockReset();
  dispatchAppCommand.mockReset();
  upcoming = [];
  overdue = [];
  brightspace = { connected: false };
});
afterEach(cleanup);

describe("AcademicPipeline", () => {
  it("lists overdue deadlines above upcoming ones", () => {
    overdue = [deadline({ _id: "late", title: "Lab report", dueAt: Date.now() - 50 * HOUR })];
    upcoming = [deadline({ _id: "soon", title: "Essay 1" })];
    render(<AcademicPipeline />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("2 days overdue")).toBeInTheDocument();
    expect(screen.getByText("Coming up")).toBeInTheDocument();
    const titles = screen.getAllByText(/Lab report|Essay 1/).map((el) => el.textContent);
    expect(titles).toEqual(["Lab report", "Essay 1"]);
  });

  it("marks a deadline done from its checkbox", () => {
    upcoming = [deadline({ _id: "soon", title: "Essay 1" })];
    render(<AcademicPipeline />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Essay 1 done" }));
    expect(setCompleted).toHaveBeenCalledWith({ id: "soon", completed: true }, expect.anything());
  });

  it("links a synced deadline back to Brightspace in a new tab", () => {
    upcoming = [
      deadline({
        title: "Quiz 2",
        source: "brightspace",
        externalUrl: "https://school.brightspace.com/d2l/le/calendar/1/event/2/detailsview",
      }),
    ];
    render(<AcademicPipeline />);
    const link = screen.getByRole("link", { name: /Brightspace/ });
    expect(link).toHaveAttribute("href", "https://school.brightspace.com/d2l/le/calendar/1/event/2/detailsview");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("offers to connect Brightspace, opening settings on the Integrations tab", () => {
    render(<AcademicPipeline />);
    fireEvent.click(screen.getByRole("button", { name: /Use Brightspace/ }));
    expect(dispatchAppCommand).toHaveBeenCalledWith("settings:integrations");
  });

  it("flags a broken connection, and says nothing when it's healthy", () => {
    brightspace = {
      connected: true,
      kind: "ical",
      host: "school.brightspace.com",
      status: "error",
      lastError: "x",
      deadlineCount: 0,
      courses: [],
    };
    const { rerender } = render(<AcademicPipeline />);
    expect(screen.getByRole("button", { name: /stopped syncing/ })).toBeInTheDocument();

    brightspace = { ...brightspace, status: "active" };
    rerender(<AcademicPipeline />);
    expect(screen.queryByRole("button", { name: /stopped syncing|Use Brightspace/ })).not.toBeInTheDocument();
  });
});
