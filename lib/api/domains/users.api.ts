import { apiFetch } from "@/lib/api/client";
import type { GamificationStatsDto } from "@/types/api/gamification";
import type {
  UpdatePreferencesInput,
  UpdateTourProgressInput,
  UserDto,
} from "@/types/api/user";

export const usersApi = {
  getMe(token: string) {
    return apiFetch<UserDto>("/users/me", { token });
  },

  getGamification(token: string) {
    return apiFetch<GamificationStatsDto>("/users/me/gamification", { token });
  },

  updateTourProgress(token: string, body: UpdateTourProgressInput) {
    return apiFetch<UserDto>("/users/me/tour", { method: "PATCH", token, body });
  },

  updatePreferences(token: string, body: UpdatePreferencesInput) {
    return apiFetch<UserDto>("/users/me/preferences", {
      method: "PATCH",
      token,
      body,
    });
  },
};
