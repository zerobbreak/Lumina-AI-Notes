export type BrightspaceCourseLinkDto = {
  id: string;
  /** The course's name as Brightspace shows it. */
  name: string;
  /** The Lumina course its deadlines go under; null until matched. */
  courseId: string | null;
  ignored: boolean;
};

export type BrightspaceSyncResultDto =
  | { ok: true; added: number; updated: number; removed: number; courses: number }
  | { ok: false; error: string };

export type BrightspaceConnectionDto = {
  connected: true;
  kind: "ical" | "oauth";
  host: string;
  /** "error": the last sync failed; lastError says why, in words for the student. */
  status: "active" | "error";
  lastSyncedAt?: number;
  lastError?: string;
  deadlineCount: number;
  courses: BrightspaceCourseLinkDto[];
};

export type BrightspaceStatusDto = { connected: false } | BrightspaceConnectionDto;

/** What connect, sync and course saves return: the new status plus how the sync went. */
export type BrightspaceSyncResponseDto = BrightspaceConnectionDto & {
  sync: BrightspaceSyncResultDto;
  /** Course imports only: how many Brightspace courses got a Lumina course. */
  imported?: number;
};
