import type { NoteDetailDto } from "@/types/api/notes";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class VersionConflictError extends ApiError {
  constructor(
    message: string,
    public readonly note: NoteDetailDto,
  ) {
    super(message, 409, "version_conflict");
    this.name = "VersionConflictError";
  }
}
