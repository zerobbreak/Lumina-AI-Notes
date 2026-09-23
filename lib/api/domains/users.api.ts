import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { SetDailyGoalsInput } from "@/types/api/account";
import type { GamificationStatsDto } from "@/types/api/gamification";
import type {
  CompleteOnboardingInput,
  UpdateAppearanceInput,
  UpdatePreferencesInput,
  UpdateTourProgressInput,
  UserDto,
} from "@/types/api/user";

export const usersApi = {
  getMe(token: string) {
    return apiFetch<UserDto>(apiPath`/users/me`, { token });
  },

  getGamification(token: string) {
    return apiFetch<GamificationStatsDto>(apiPath`/users/me/gamification`, { token });
  },

  updateTourProgress(token: string, body: UpdateTourProgressInput) {
    return apiFetch<UserDto>(apiPath`/users/me/tour`, { method: "PATCH", token, body });
  },

  updatePreferences(token: string, body: UpdatePreferencesInput) {
    return apiFetch<UserDto>(apiPath`/users/me/preferences`, {
      method: "PATCH",
      token,
      body,
    });
  },

  updateAppearance(token: string, body: UpdateAppearanceInput) {
    return apiFetch<UserDto>(apiPath`/users/me/appearance`, {
      method: "PATCH",
      token,
      body,
    });
  },

  setDailyGoals(token: string, body: SetDailyGoalsInput) {
    return apiFetch<GamificationStatsDto>(apiPath`/users/me/daily-goals`, {
      method: "PATCH",
      token,
      body,
    });
  },

  completeOnboarding(token: string, body: CompleteOnboardingInput) {
    return apiFetch<UserDto>(apiPath`/users/me/onboarding`, {
      method: "POST",
      token,
      body,
    });
  },
};
