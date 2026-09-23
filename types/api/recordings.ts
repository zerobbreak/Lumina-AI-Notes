export type RecordingDto = {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  transcript: string;
  audioUrl?: string | null;
  duration?: number | null;
  createdAt: string | number;
};

export type AudioLimitDto = {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  error?: string;
};

export type CleanupOrphanedResultDto = {
  deletedCount: number;
};
