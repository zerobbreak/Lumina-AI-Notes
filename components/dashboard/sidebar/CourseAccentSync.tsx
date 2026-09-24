"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import { useNote } from "@/lib/queries/notes/useNote";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

/**
 * Tells the appearance provider which course is on screen, for "accent follows
 * course": the course page itself, or the course a note is filed under. Lives
 * in the dashboard because the root provider can't read the URL's search
 * params without opting every static page out of prerendering.
 */
export function CourseAccentSync() {
  const searchParams = useSearchParams();
  const { setCourseAccent } = useAppearance();
  const { data: user } = useCurrentUser();
  const { data: note } = useNote(searchParams.get("noteId"));

  const courseId =
    searchParams.get("contextType") === "course"
      ? searchParams.get("contextId")
      : (note?.courseId ?? null);
  const color = user?.courses?.find((c) => c.id === courseId)?.color ?? null;

  useEffect(() => {
    setCourseAccent(color);
  }, [color, setCourseAccent]);
  useEffect(() => () => setCourseAccent(null), [setCourseAccent]);

  return null;
}
