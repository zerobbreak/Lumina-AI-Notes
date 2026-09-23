import type { Id } from "@/types/data-model";
import type { TagWithCountDto } from "@/types/api/tags";

export type TagWithCount = {
  _id: Id<"tags">;
  name: string;
  color: string;
  count: number;
};

export function toTagWithCount(dto: TagWithCountDto): TagWithCount {
  return {
    _id: dto.id as Id<"tags">,
    name: dto.name,
    color: dto.color,
    count: dto.count,
  };
}

export function toTagsWithCounts(rows: TagWithCountDto[]) {
  return rows.map(toTagWithCount);
}
