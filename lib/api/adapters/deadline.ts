import type { DeadlineDto } from "@/types/api/deadlines";

/** Convex-shaped deadline for UI code still using `_id`. */
export type DeadlineModel = Omit<DeadlineDto, "id"> & { _id: string };

export function toDeadline(dto: DeadlineDto): DeadlineModel {
  const { id, ...rest } = dto;
  return { ...rest, _id: id };
}

export function toDeadlines(rows: DeadlineDto[]) {
  return rows.map(toDeadline);
}
