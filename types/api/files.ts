export type CreateFileBody = {
  name: string;
  type: string;
  courseId?: string;
  url?: string;
  storageKey?: string;
};

export type FileListItemDto = {
  id: string;
  userId: string;
  name: string;
  type: string;
  url?: string | null;
  storageKey?: string | null;
  courseId?: string | null;
  createdAt: number;
  processingStatus?: string | null;
  progressPercent?: number | null;
  queuePosition?: number | null;
  errorMessage?: string | null;
};
