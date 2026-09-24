export type DeadlineDto = {
  id: string;
  userId: string;
  title: string;
  dueAt: number;
  kind: string;
  courseId?: string;
  moduleId?: string;
  notes?: string;
  completedAt?: number;
  /** "manual", or the LMS it was synced from. */
  source: "manual" | "brightspace";
  /** Opens the item in the LMS; synced deadlines only. */
  externalUrl?: string;
  createdAt: number;
  updatedAt: number;
};
