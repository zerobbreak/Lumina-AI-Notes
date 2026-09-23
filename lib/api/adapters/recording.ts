import type { Id } from "@/types/data-model";
import { withConvexId } from "@/lib/api/adapters/convex-id";
import type { RecordingDto } from "@/types/api/recordings";

function toTimestamp(value: string | number): number {
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

export type RecordingModel = Omit<RecordingDto, "id" | "createdAt"> & {
  _id: Id<"recordings">;
  createdAt: number;
};

export function toRecording(dto: RecordingDto): RecordingModel {
  const { id, createdAt, ...rest } = dto;
  return {
    ...rest,
    _id: id as Id<"recordings">,
    createdAt: toTimestamp(createdAt),
  };
}

export function toRecordings(rows: RecordingDto[]) {
  return rows.map(toRecording);
}
