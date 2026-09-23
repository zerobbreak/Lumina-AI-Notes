import { toTimestamp } from "@/lib/api/adapters/timestamp";
import type { PublicNoteDto } from "@/types/api/public";

export type PublicNote = {
  _id: string;
  title: string;
  content: string;
  style?: string;
  outlineData?: string;
  outlineMetadata?: unknown;
  createdAt: number;
  updatedAt: number;
};

export function toPublicNote(dto: PublicNoteDto): PublicNote {
  return {
    _id: dto.id,
    title: dto.title,
    content: dto.content ?? "",
    style: dto.style ?? undefined,
    outlineData: dto.outlineData ?? undefined,
    outlineMetadata: dto.outlineMetadata,
    createdAt: toTimestamp(dto.createdAt) ?? 0,
    updatedAt: toTimestamp(dto.updatedAt) ?? 0,
  };
}
