import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Announcement } from "@/lib/announcements/registry";

const record = vi.fn();
const clearForced = vi.fn();
let hookState: { spotlight: Announcement | null; spotlightForced: boolean };

vi.mock("@/lib/announcements/useAnnouncements", () => ({
  useAnnouncements: () => ({ ...hookState, record, clearForced }),
}));

import { SpotlightCard } from "@/components/dashboard/announcements/SpotlightCard";

const launch: Announcement = {
  id: "launch",
  title: "Make Lumina yours",
  body: "Pick a world.",
  publishedAt: 0,
  priority: "major",
  cta: { label: "Personalise Lumina", action: { type: "open-settings", tab: "appearance" } },
};

beforeEach(() => {
  record.mockReset();
  clearForced.mockReset();
  hookState = { spotlight: launch, spotlightForced: false };
});
afterEach(cleanup);

describe("SpotlightCard", () => {
  it("renders nothing without a spotlight", () => {
    hookState.spotlight = null;
    const { container } = render(<SpotlightCard onAction={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("records a view when it appears", () => {
    render(<SpotlightCard onAction={vi.fn()} />);
    expect(screen.getByText("Make Lumina yours")).toBeInTheDocument();
    expect(record).toHaveBeenCalledWith("launch", "seen");
  });

  it("records a dismissal", () => {
    render(<SpotlightCard onAction={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(record).toHaveBeenCalledWith("launch", "dismissed");
  });

  it("records the click and runs the call-to-action", () => {
    const onAction = vi.fn();
    render(<SpotlightCard onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: /Personalise Lumina/ }));
    expect(record).toHaveBeenCalledWith("launch", "clicked");
    expect(onAction).toHaveBeenCalledWith({ type: "open-settings", tab: "appearance" });
  });

  it("records nothing for a forced card, and clears the param instead", () => {
    hookState.spotlightForced = true;
    const onAction = vi.fn();
    render(<SpotlightCard onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: /Personalise Lumina/ }));
    expect(onAction).toHaveBeenCalled();
    expect(clearForced).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });
});
