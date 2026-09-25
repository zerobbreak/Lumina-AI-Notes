"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourPlacement, TourStep } from "@/lib/tour/tours";

interface TourOverlayProps {
  steps: readonly TourStep[];
  open: boolean;
  /** Step to open on, e.g. where the user left off. */
  initialStep?: number;
  onStepChange?: (index: number) => void;
  /** Finished the last step. */
  onComplete: () => void;
  /** Closed early with Skip, the close button or Esc. */
  onSkip: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };

const GAP = 12;
const EDGE = 16;
const PAD = 6;
/** Content loads in after the tour opens, so keep looking for the target. */
const REMEASURE_MS = 250;

/** The first element with this data-tour value that's actually laid out. */
function findTarget(target: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function sameRect(a: Rect | null, b: Rect | null) {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

/**
 * Where the card goes: on the preferred side if it fits, else the opposite
 * side, else the other axis, else pinned inside the viewport (a target taller
 * than the screen has no outside).
 */
export function placeCard(
  rect: Rect,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  preferred: TourPlacement = "bottom",
): { top: number; left: number } {
  const fits: Record<TourPlacement, boolean> = {
    bottom: rect.top + rect.height + GAP + card.height <= viewport.height - EDGE,
    top: rect.top - GAP - card.height >= EDGE,
    right: rect.left + rect.width + GAP + card.width <= viewport.width - EDGE,
    left: rect.left - GAP - card.width >= EDGE,
  };
  const opposite: Record<TourPlacement, TourPlacement> = { bottom: "top", top: "bottom", left: "right", right: "left" };
  const order: TourPlacement[] = [preferred, opposite[preferred], "bottom", "top", "right", "left"];
  const side = order.find((p) => fits[p]);

  const centredX = clamp(rect.left + rect.width / 2 - card.width / 2, EDGE, viewport.width - card.width - EDGE);
  const centredY = clamp(rect.top + rect.height / 2 - card.height / 2, EDGE, viewport.height - card.height - EDGE);

  switch (side) {
    case "bottom":
      return { top: rect.top + rect.height + GAP, left: centredX };
    case "top":
      return { top: rect.top - GAP - card.height, left: centredX };
    case "right":
      return { top: centredY, left: rect.left + rect.width + GAP };
    case "left":
      return { top: centredY, left: rect.left - GAP - card.width };
    default:
      return { top: viewport.height - card.height - EDGE, left: centredX };
  }
}

export function TourOverlay({
  steps,
  open,
  initialStep = 0,
  onStepChange,
  onComplete,
  onSkip,
}: TourOverlayProps) {
  const [index, setIndex] = useState(() => clamp(initialStep, 0, steps.length - 1));
  // Each measurement remembers what it was for, so a stale one reads as none.
  const [measured, setMeasured] = useState<{ target: string; rect: Rect | null } | null>(null);
  const [placed, setPlaced] = useState<{ rect: Rect; pos: { top: number; left: number } } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const rect = open && step?.target && measured?.target === step.target ? measured.rect : null;
  const cardPos = rect && placed?.rect === rect ? placed.pos : null;

  const goTo = useCallback(
    (next: number) => {
      const bounded = clamp(next, 0, steps.length - 1);
      setIndex(bounded);
      onStepChange?.(bounded);
    },
    [steps.length, onStepChange],
  );

  const next = useCallback(() => (isLast ? onComplete() : goTo(index + 1)), [isLast, onComplete, goTo, index]);
  const back = useCallback(() => goTo(index - 1), [goTo, index]);

  // Bring the target into view once per step, then track where it is.
  useEffect(() => {
    const target = step?.target;
    if (!open || !target) return;
    let scrolled = false;
    const measure = () => {
      const el = findTarget(target);
      if (!el) {
        setMeasured((prev) => (prev?.target === target && prev.rect === null ? prev : { target, rect: null }));
        return;
      }
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ block: "center", inline: "nearest" });
      }
      const r = el.getBoundingClientRect();
      const nextRect = { top: r.top, left: r.left, width: r.width, height: r.height };
      setMeasured((prev) =>
        prev?.target === target && sameRect(prev.rect, nextRect) ? prev : { target, rect: nextRect },
      );
    };
    measure();
    const timer = window.setInterval(measure, REMEASURE_MS);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step?.target]);

  // Place the card once its size is known.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !rect) return;
    const spot = { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
    setPlaced({
      rect,
      pos: placeCard(
        spot,
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        step?.placement,
      ),
    });
  }, [rect, index, step?.placement]);

  // Keyboard focus follows the card, so Enter and screen readers land on it.
  useEffect(() => {
    if (open) nextRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onSkip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "Tab") {
        // Keep focus inside the card while it's modal.
        const focusables = cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    // Capture, so the app's own shortcuts don't also fire underneath.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, next, back, onSkip]);

  if (!open || !step) return null;

  const spotlight = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // On <body>, so it covers the sidebar and floating pill whatever stacking
  // context the page that opened it sits in.
  return createPortal(
    <div className="fixed inset-0 z-[100]" data-testid="tour-overlay">
      {/* Swallows clicks: the page underneath is for looking at, not using. */}
      {spotlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary motion-safe:transition-all motion-safe:duration-200"
          style={{ ...spotlight, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.62)" }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-black/60" />
      )}
      <div aria-hidden className="absolute inset-0" />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "absolute w-[min(340px,calc(100vw-32px))] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl",
          !cardPos && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={cardPos ?? undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary" aria-live="polite">
            Step {index + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Close tour"
            className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id={titleId} className="mt-1.5 text-[15px] font-semibold leading-snug text-foreground">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  "h-1.5 rounded-full motion-safe:transition-all",
                  i === index ? "w-4 bg-primary" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {index === 0 ? (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={back}>
                Back
              </Button>
            )}
            <Button ref={nextRef} size="sm" onClick={next}>
              {isLast ? "Done" : index === 0 ? "Show me" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
