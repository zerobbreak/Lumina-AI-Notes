import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import { DELETE_ACCOUNT_CONFIRMATION, type UsageDto } from "@/types/api/account";

export const accountApi = {
  getUsage(token: string) {
    return apiFetch<UsageDto>(apiPath`/users/me/usage`, { token });
  },

  /** Everything the user owns, as parsed JSON; the caller saves it as a file. */
  exportData(token: string) {
    return apiFetch<unknown>(apiPath`/users/me/export`, { token });
  },

  deleteAccount(token: string) {
    return apiFetch<void>(apiPath`/users/me`, {
      method: "DELETE",
      token,
      body: { confirm: DELETE_ACCOUNT_CONFIRMATION },
    });
  },
};
