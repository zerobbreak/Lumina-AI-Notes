import type { Id } from "@/convex/_generated/dataModel";
import type { FileListItemDto } from "@/types/api/files";
import type { UserFile } from "@/types";

export function toUserFile(dto: FileListItemDto): UserFile {
  return {
    _id: dto.id as Id<"files">,
    userId: dto.userId,
    name: dto.name,
    type: dto.type,
    url: dto.url ?? undefined,
    storageId: dto.storageKey ?? undefined,
    courseId: dto.courseId ?? undefined,
    createdAt: dto.createdAt,
    processingStatus: dto.processingStatus ?? undefined,
    progressPercent: dto.progressPercent ?? undefined,
    queuePosition: dto.queuePosition ?? undefined,
    errorMessage: dto.errorMessage ?? undefined,
  };
}

export function toUserFiles(rows: FileListItemDto[]) {
  return rows.map(toUserFile);
}
