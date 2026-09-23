import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";

export const authApi = {
  acceptPendingInvites(token: string) {
    return apiFetch<{ accepted: number }>(apiPath`/auth/accept-invites`, {
      method: "POST",
      token,
    });
  },
};
