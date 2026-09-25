"use client";

import { forwardRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateDeadline } from "@/lib/mutations/deadlines/useCreateDeadline";
import { cn } from "@/lib/utils";
import type { Course } from "@/types";
import { courseLabel } from "@/components/dashboard/home/parts";

type Kind = "task" | "assignment" | "exam" | "event";

const KINDS: Array<{ value: Kind; label: string }> = [
  { value: "task", label: "Task" },
  { value: "assignment", label: "Assignment" },
  { value: "exam", label: "Test or exam" },
  { value: "event", label: "Event" },
];

const fieldClass =
  "h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Adds a deadline on the selected day without leaving the calendar. */
export const QuickAdd = forwardRef<HTMLInputElement, { date: Date; courses: Course[] }>(function QuickAdd(
  { date, courses },
  inputRef,
) {
  const create = useCreateDeadline();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("task");
  const [time, setTime] = useState("23:59");
  const [courseId, setCourseId] = useState("");

  const dayName = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || create.isPending) return;
    const [h, m] = time.split(":").map(Number);
    const dueAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h ?? 23, m ?? 59).getTime();
    create.mutate(
      { title: trimmed, dueAt, kind, courseId: courseId || undefined },
      {
        onSuccess: () => {
          setTitle("");
          toast.success(`Added to ${dayName}`);
        },
        onError: () => toast.error("Couldn't add that. Try again."),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-card p-2 dark:bg-inset">
      <div className="flex items-center gap-2 pl-1">
        <label htmlFor="calendar-quick-add" className="sr-only">
          Add to {dayName}
        </label>
        <input
          ref={inputRef}
          id="calendar-quick-add"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Add to ${dayName}…`}
          maxLength={500}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        <Button type="submit" size="sm" className="h-8 gap-1 px-3" disabled={!title.trim() || create.isPending}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
        </Button>
      </div>
      <div className={cn("flex flex-wrap items-center gap-1.5", !title.trim() && "hidden")}>
        <label className="sr-only" htmlFor="calendar-quick-add-kind">
          Kind
        </label>
        <select
          id="calendar-quick-add-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          className={fieldClass}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="calendar-quick-add-time">
          Time
        </label>
        <input
          id="calendar-quick-add-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value || "23:59")}
          className={fieldClass}
        />
        {courses.length > 0 && (
          <>
            <label className="sr-only" htmlFor="calendar-quick-add-course">
              Module
            </label>
            <select
              id="calendar-quick-add-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className={cn(fieldClass, "min-w-0 max-w-[10rem]")}
            >
              <option value="">No module</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {courseLabel(c)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </form>
  );
});
