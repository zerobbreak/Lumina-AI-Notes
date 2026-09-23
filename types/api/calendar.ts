export type CalendarRecordingDto = {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  transcript: string;
  audioUrl?: string | null;
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

export type CalendarActivityDto = {
  recordings: CalendarRecordingDto[];
  notes: CalendarNoteDto[];
};
