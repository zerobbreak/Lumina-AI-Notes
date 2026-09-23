import type { UserDto } from "@/types/api/user";
import type { UserData } from "@/types";

/** Maps REST user payload to the Convex-shaped type the UI still expects. */
export function toUserData(dto: UserDto): UserData {
  return {
    _id: dto.id,
    tokenIdentifier: dto.clerkUserId,
    email: dto.email,
    name: dto.name ?? undefined,
    image: dto.image ?? undefined,
    onboardingComplete: dto.onboardingComplete,
    major: dto.major ?? undefined,
    semester: dto.semester ?? undefined,
    courses: dto.courses,
    noteStyle: dto.noteStyle ?? undefined,
    theme: dto.theme ?? undefined,
    enabledBlocks: dto.enabledBlocks,
    tourCompleted: dto.tourCompleted,
    tourStep: dto.tourStep,
  };
}
