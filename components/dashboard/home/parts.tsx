"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseTile } from "@/components/dashboard/sidebar/CourseTile";
import { ACCENT_INFO } from "@/lib/appearance/catalog";
import { isPlaceholderCourseCode } from "@/lib/courseDisplay";
import type { PlanAction } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";

/**
 * Building blocks shared by the home parts (plan, runway, coming up, pulse…),
 * so they read as one system and can be arranged in any order.
 */

export type CourseLookup = (courseId: string | null | undefined) => Course | undefined;

export const courseLabel = (course: Course) => (isPlaceholderCourseCode(course.code) ? course.name : course.code);

/** The course's colour as a CSS colour; the theme's primary when it has none. */
export function courseColor(course?: Course) {
  const swatch = course?.color ? ACCENT_INFO.find((a) => a.id === course.color)?.swatch : undefined;
  return swatch ? `hsl(${swatch})` : "hsl(var(--primary))";
}

export function HomeCard({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-card shadow-sm dark:bg-inset dark:shadow-none", className)}
      {...rest}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <p className={cn("text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground", className)} {...rest}>
      {children}
    </p>
  );
}

export type Tone = "critical" | "warning" | "good" | "neutral";

export function Chip({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "critical" && "bg-destructive/10 text-destructive",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "good" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "neutral" && "bg-muted text-muted-foreground dark:bg-foreground/5",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CourseMark({ course, className }: { course?: Course; className?: string }) {
  if (!course) return null;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground", className)}>
      <CourseTile name={course.name} code={course.code} color={course.color} />
      <span className="truncate">{courseLabel(course)}</span>
    </span>
  );
}

export function ActionButton({
  action,
  variant = "outline",
  className,
}: {
  action: PlanAction | null;
  variant?: "outline" | "default";
  className?: string;
}) {
  if (!action) return null;
  return (
    <Button asChild size="sm" variant={variant} className={cn("h-8 whitespace-nowrap", className)}>
      {action.external ? (
        <a href={action.href} target="_blank" rel="noopener noreferrer">
          {action.label}
          <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <Link href={action.href}>{action.label}</Link>
      )}
    </Button>
  );
}

/** A 0–1 value as a ring, for readiness. */
export function Ring({ value, tone, size = 64 }: { value: number; tone: Tone; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const stroke =
    tone === "critical"
      ? "hsl(var(--destructive))"
      : tone === "warning"
        ? "hsl(var(--warning))"
        : "hsl(var(--primary))";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={7} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/** Readiness below 35% is behind, below 60% needs a session. */
export function readinessTone(readiness: number | null): Tone {
  if (readiness === null) return "neutral";
  if (readiness < 0.35) return "critical";
  if (readiness < 0.6) return "warning";
  return "good";
}
