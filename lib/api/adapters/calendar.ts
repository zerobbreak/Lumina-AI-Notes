import type { Id } from "@/types/data-model";
import type { CalendarActivityDto } from "@/types/api/calendar";

export type CalendarRecording = {
  _id: Id<"recordings">;
  userId: string;
  title: string;
  createdAt: number;
  duration?: number;
};

export type CalendarNote = {
  _id: Id<"notes">;
  userId: string;
  title: string;
  courseId?: string;
  quickCaptureStatus?: string;
  createdAt: number;
};

export function toCalendarActivity(dto: CalendarActivityDto) {
  return {
    recordings: dto.recordings.map(
      (r): CalendarRecording => ({
        _id: r.id as Id<"recordings">,
        userId: r.userId,
        title: r.title,
        createdAt: r.createdAt,
        duration: r.duration ?? undefined,
      }),
    ),
    notes: dto.notes.map(
      (n): CalendarNote => ({
        _id: n.id as Id<"notes">,
        userId: n.userId,
        title: n.title,
        courseId: n.courseId ?? undefined,
        quickCaptureStatus: n.quickCaptureStatus ?? undefined,
        createdAt: n.createdAt,
      }),
    ),
  };
}
