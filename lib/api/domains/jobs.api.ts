import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { JobDto } from "@/types/api/jobs";

export const jobsApi = {
  getById(token: string, jobId: string) {
    return apiFetch<JobDto>(apiPath`/jobs/${jobId}`, { token });
  },

  /** Runs a failed job again, from where it stopped. */
  retry(token: string, jobId: string) {
    return apiFetch<JobDto>(apiPath`/jobs/${jobId}/retry`, { method: "POST", token });
  },

  /** Gives up on a failed job and unlocks its note. */
  dismiss(token: string, jobId: string) {
    return apiFetch<void>(apiPath`/jobs/${jobId}/dismiss`, { method: "POST", token });
  },
};
