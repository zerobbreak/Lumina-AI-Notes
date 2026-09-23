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
  createdAt: number;
  updatedAt: number;
};
