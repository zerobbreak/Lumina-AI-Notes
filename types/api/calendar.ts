/** Mirrors server/src/routes/calendar.ts: GET /api/v1/calendar/activity. */

export type CalendarRecordingDto = {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  /** Seconds */
  duration?: number | null;
  createdAt: number;
};

export type CalendarNoteDto = {
  id: string;
  userId: string;
  title: string;
  courseId?: string | null;
  moduleId?: string | null;
  quickCaptureStatus?: string | null;
  createdAt: number;
};

/** Cards reviewed and quizzes taken on one of the user's local days. */
export type CalendarStudyDayDto = {
  /** YYYY-MM-DD in the user's time zone. */
  day: string;
  reviews: number;
  quizzes: number;
};

export type CalendarActivityDto = {
  recordings: CalendarRecordingDto[];
  notes: CalendarNoteDto[];
  /** Only days with something on them, oldest first. Missing from older servers. */
  study?: CalendarStudyDayDto[];
};
