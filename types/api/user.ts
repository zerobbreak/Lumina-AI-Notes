import type { Appearance } from "@/lib/appearance/model";
import type { Course } from "@/types";

/** Response from `GET /users/me` (gamification fields omitted). */
export type UserDto = {
  id: string;
  clerkUserId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  onboardingComplete: boolean;
  major?: string | null;
  semester?: string | null;
  courses: Course[];
  noteStyle?: string | null;
  appearance: Appearance;
  enabledBlocks: string[];
  tourCompleted: boolean;
  tourStep: number;
  createdAt: number;
  updatedAt: number;
};

export type UpdateTourProgressInput = {
  completed?: boolean;
  step?: number;
};

export type UpdatePreferencesInput = {
  major?: string;
  noteStyle?: string;
};

export type UpdateAppearanceInput = Partial<Appearance>;

export type CompleteOnboardingInput = {
  major: string;
  semester: string;
  courses: Array<{
    id: string;
    name: string;
    code: string;
    defaultNoteStyle?: string;
  }>;
  noteStyle: string;
  enabledBlocks: string[];
};
