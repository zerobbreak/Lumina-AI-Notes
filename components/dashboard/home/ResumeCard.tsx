"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseTile } from "@/components/dashboard/sidebar/CourseTile";
import { isPlaceholderCourseCode } from "@/lib/courseDisplay";
import { timeAgo } from "@/lib/home/planCopy";
import type { Course } from "@/types";
import type { HomeResumeDto } from "@/types/api/home";

/** The note you last had open, with enough of it to remember where you were. */
export function ResumeCard({ resume, course, now }: { resume: HomeResumeDto; course?: Course; now: number }) {
  const moduleTitle = course?.modules?.find((m) => m.id === resume.moduleId)?.title;

  return (
    <section
      aria-labelledby="resume-heading"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:bg-inset dark:shadow-none"
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Pick up where you left off · {timeAgo(resume.lastAccessedAt, now)}
      </p>
      <h2 id="resume-heading" className="mt-2 font-reading text-xl font-medium leading-snug text-foreground">
        {resume.title || "Untitled note"}
      </h2>
      {resume.preview && (
        <p className="mt-2 line-clamp-3 border-l-2 border-border pl-3 font-reading text-[15px] leading-relaxed text-muted-foreground">
          {resume.preview}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {course ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CourseTile name={course.name} code={course.code} color={course.color} />
            <span className="truncate">
              {isPlaceholderCourseCode(course.code) ? course.name : course.code}
              {moduleTitle && ` · ${moduleTitle}`}
            </span>
          </span>
        ) : (
          <span />
        )}
        <Link
          href={`/dashboard?noteId=${resume.noteId}`}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
