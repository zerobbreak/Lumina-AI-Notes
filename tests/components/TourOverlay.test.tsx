import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { placeCard, TourOverlay } from "@/components/dashboard/TourOverlay";
import type { TourStep } from "@/lib/tour/tours";

const steps: TourStep[] = [
  { id: "a", title: "First", body: "The first step of the tour, centred." },
  { id: "b", title: "Second", body: "Points at an element that exists.", target: "thing" },
  { id: "c", title: "Third", body: "Points at an element that isn't there.", target: "missing" },
];

function setup(props: Partial<Parameters<typeof TourOverlay>[0]> = {}) {
  const onComplete = vi.fn();
  const onSkip = vi.fn();
  const onStepChange = vi.fn();
  render(
    <>
      <div data-tour="thing">thing</div>
      <TourOverlay steps={steps} open onComplete={onComplete} onSkip={onSkip} onStepChange={onStepChange} {...props} />
    </>,
  );
  return { onComplete, onSkip, onStepChange };
}

afterEach(cleanup);

describe("TourOverlay", () => {
  it("walks forward and back, reporting each step", () => {
    const { onStepChange } = setup();
    expect(screen.getByRole("dialog", { name: "First" })).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("dialog", { name: "Second" })).toBeTruthy();
    expect(onStepChange).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "First" })).toBeTruthy();
    expect(onStepChange).toHaveBeenLastCalledWith(0);
  });

  it("still explains a step whose element isn't on screen", () => {
    setup({ initialStep: 2 });
    expect(screen.getByRole("dialog", { name: "Third" })).toBeTruthy();
    expect(screen.getByText("Points at an element that isn't there.")).toBeTruthy();
  });

  it("finishes on the last step", () => {
    const { onComplete, onSkip } = setup({ initialStep: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("moves with the arrow keys and leaves with Esc", () => {
    const { onSkip } = setup();
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    expect(screen.getByRole("dialog", { name: "Second" })).toBeTruthy();
    act(() => {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
    });
    expect(screen.getByRole("dialog", { name: "First" })).toBeTruthy();
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("skips from the first step and closes from any step", () => {
    const { onSkip } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "Close tour" }));
    expect(onSkip).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when closed", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("placeCard", () => {
  const card = { width: 300, height: 150 };
  const viewport = { width: 1200, height: 800 };

  it("goes on the preferred side when it fits", () => {
    const pos = placeCard({ top: 100, left: 20, width: 200, height: 40 }, card, viewport, "right");
    expect(pos.left).toBe(20 + 200 + 12);
  });

  it("flips to the other side when the preferred one is off screen", () => {
    const pos = placeCard({ top: 700, left: 400, width: 200, height: 60 }, card, viewport, "bottom");
    expect(pos.top).toBe(700 - 12 - 150);
  });

  it("pins inside the screen when the target fills it", () => {
    const pos = placeCard({ top: 0, left: 0, width: 1200, height: 800 }, card, viewport, "bottom");
    expect(pos.top).toBe(800 - 150 - 16);
    expect(pos.left).toBeGreaterThanOrEqual(16);
  });
});
