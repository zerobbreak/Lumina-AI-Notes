import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { BrightspaceStatusDto, BrightspaceSyncResponseDto } from "@/types/api/integrations";

export const brightspaceApi = {
  getStatus(token: string) {
    return apiFetch<BrightspaceStatusDto>(apiPath`/integrations/brightspace`, { token });
  },

  /** Connects, or replaces the link. The server checks the link works before saving it. */
  connectFeed(token: string, url: string) {
    return apiFetch<BrightspaceSyncResponseDto>(apiPath`/integrations/brightspace/feed`, {
      method: "POST",
      token,
      body: { url },
    });
  },

  sync(token: string) {
    return apiFetch<BrightspaceSyncResponseDto>(apiPath`/integrations/brightspace/sync`, {
      method: "POST",
      token,
    });
  },

  saveCourses(token: string, courses: Array<{ id: string; courseId: string | null; ignored: boolean }>) {
    return apiFetch<BrightspaceSyncResponseDto>(apiPath`/integrations/brightspace/courses`, {
      method: "PUT",
      token,
      body: { courses },
    });
  },

  disconnect(token: string) {
    return apiFetch<void>(apiPath`/integrations/brightspace`, { method: "DELETE", token });
  },
};
