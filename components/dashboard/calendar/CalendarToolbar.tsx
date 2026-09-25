"use client";

import { ChevronLeft, ChevronRight, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarFilters } from "@/lib/calendar/month";
import { timeAgo } from "@/lib/home/planCopy";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import type { BrightspaceStatusDto } from "@/types/api/integrations";
import { courseColor, courseLabel } from "@/components/dashboard/home/parts";

function Toggle({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground dark:bg-inset",
      )}
    >
      {children}
    </button>
  );
}

function SyncStatus({ status, now }: { status?: BrightspaceStatusDto; now: number }) {
  if (!status?.connected) return null;
  if (status.status === "error") {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-destructive md:inline-flex">
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
        Brightspace sync failed
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:inline-flex">
      <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" aria-hidden />
      {status.lastSyncedAt ? `Brightspace synced ${timeAgo(status.lastSyncedAt, now)}` : "Brightspace connected"}
    </span>
  );
}

/** Month name and navigation, then the filters. */
export function CalendarToolbar({
  monthStart,
  courses,
  filters,
  brightspace,
  now,
  onMonth,
  onToday,
  onAdd,
  onFilters,
}: {
  monthStart: Date;
  courses: Course[];
  filters: CalendarFilters;
  brightspace?: BrightspaceStatusDto;
  now: number;
  onMonth: (delta: number) => void;
  onToday: () => void;
  onAdd: () => void;
  onFilters: (next: CalendarFilters) => void;
}) {
  const toggleCourse = (id: string) =>
    onFilters({
      ...filters,
      hiddenCourses: filters.hiddenCourses.includes(id)
        ? filters.hiddenCourses.filter((c) => c !== id)
        : [...filters.hiddenCourses, id],
    });

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 md:px-8">
        <div className="flex items-center gap-3">
          <h1 className="font-reading text-[28px] font-medium leading-none tracking-[-0.01em] text-foreground">
            {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={() => onMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next month" onClick={() => onMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={onToday}>
              Today
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus status={brightspace} now={now} />
          <Button size="sm" className="h-8 gap-1.5" onClick={onAdd}>
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 md:px-8" role="group" aria-label="Filters">
        {courses.map((c) => (
          <Toggle key={c.id} pressed={!filters.hiddenCourses.includes(c.id)} onClick={() => toggleCourse(c.id)}>
            <span className="h-2 w-2 rounded-full" style={{ background: courseColor(c) }} aria-hidden />
            {courseLabel(c)}
          </Toggle>
        ))}
        {courses.length > 0 && <span className="mx-1.5 h-4 w-px shrink-0 bg-border" aria-hidden />}
        <Toggle pressed={filters.events} onClick={() => onFilters({ ...filters, events: !filters.events })}>
          Events
        </Toggle>
        <Toggle pressed={filters.completed} onClick={() => onFilters({ ...filters, completed: !filters.completed })}>
          Completed
        </Toggle>
        <Toggle pressed={filters.activity} onClick={() => onFilters({ ...filters, activity: !filters.activity })}>
          Study activity
        </Toggle>
      </div>
    </div>
  );
}
