"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/home/planCopy";
import type { Course } from "@/types";
import type { HomeResumeDto } from "@/types/api/home";
import { CourseMark, Eyebrow, HomeCard } from "./parts";

/** The note you last had open, with enough of it to remember where you were. */
export function ResumeCard({ resume, course, now }: { resume: HomeResumeDto; course?: Course; now: number }) {
  return (
    <HomeCard aria-labelledby="resume-heading" className="flex flex-col gap-2 p-5">
      <Eyebrow>Pick up where you left off · {timeAgo(resume.lastAccessedAt, now)}</Eyebrow>
      <h2 id="resume-heading" className="font-reading text-[19px] font-medium leading-snug text-foreground">
        {resume.title || "Untitled note"}
      </h2>
      {resume.preview && (
        <blockquote className="line-clamp-3 border-l-2 border-border pl-2.5 font-reading text-[14.5px] leading-[1.45] text-muted-foreground">
          {resume.preview}
        </blockquote>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-2.5">
        <Button asChild size="sm" variant="outline" className="h-8">
          <Link href={`/dashboard?noteId=${resume.noteId}`}>Continue writing</Link>
        </Button>
        <CourseMark course={course} />
      </div>
    </HomeCard>
  );
}
