"use client";

import { Calendar, FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useNotesByContextData } from "@/lib/hooks/notes/useNotesByContextData";
import { useUpcomingDeadlines } from "@/lib/queries/deadlines/useUpcomingDeadlines";
import { DockRow } from "./DockCard";

function dueIn(dueAt: number) {
  const days = Math.round((dueAt - Date.now()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

/** What sits around this note: its sub-pages, its course, the next deadline. */
export function ConnectedCard({
  noteId,
  courseId,
  courseName,
  subPages,
  canEdit,
  onCreateSubPage,
  onNavigate,
}: {
  noteId: string;
  courseId?: string;
  courseName?: string;
  subPages: readonly { _id: string; title: string }[];
  canEdit: boolean;
  onCreateSubPage: () => void;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const courseNotes = useNotesByContextData({ courseId: courseId ?? "" }, { enabled: Boolean(courseId) });
  const { data: deadlines } = useUpcomingDeadlines({ limit: 20 });

  const siblings = useMemo(
    () =>
      (courseNotes ?? [])
        .filter((n) => n._id !== noteId && !n.parentNoteId && !n.isArchived)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 4),
    [courseNotes, noteId],
  );
  const deadline = courseId ? deadlines?.find((d) => d.courseId === courseId) : undefined;

  const open = (href: string) => {
    onNavigate();
    router.push(href);
  };

  const nothing = !subPages.length && !siblings.length && !deadline && !canEdit;

  return (
    <div className="space-y-3">
      {(subPages.length > 0 || canEdit) && (
        <div>
          <p className="mb-0.5 text-[11px] text-muted-foreground">Sub-pages</p>
          {subPages.map((p) => (
            <DockRow
              key={p._id}
              icon={<FileText className="h-3.5 w-3.5" />}
              label={p.title || "Untitled"}
              onClick={() => open(`/dashboard?noteId=${p._id}`)}
            />
          ))}
          {canEdit && (
            <DockRow icon={<Plus className="h-3.5 w-3.5" />} label="Add a sub-page" onClick={onCreateSubPage} />
          )}
        </div>
      )}

      {siblings.length > 0 && (
        <div>
          <p className="mb-0.5 text-[11px] text-muted-foreground">Also in {courseName ?? "this course"}</p>
          {siblings.map((n) => (
            <DockRow
              key={n._id}
              icon={<FileText className="h-3.5 w-3.5" />}
              label={n.title || "Untitled"}
              onClick={() => open(`/dashboard?noteId=${n._id}`)}
            />
          ))}
        </div>
      )}

      {deadline && (
        <div>
          <p className="mb-0.5 text-[11px] text-muted-foreground">Next deadline</p>
          <DockRow
            icon={<Calendar className="h-3.5 w-3.5" />}
            label={deadline.title}
            meta={<span className="text-warning">{dueIn(deadline.dueAt)}</span>}
            onClick={() => open("/dashboard?view=calendar")}
          />
        </div>
      )}

      {nothing && <p className="text-[12.5px] text-muted-foreground">Nothing linked to this note yet.</p>}
    </div>
  );
}
