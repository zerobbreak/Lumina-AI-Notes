import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { STALE_MS } from "@/lib/queries/polling";

/**
 * Retry once for network and server errors. A 4xx won't change on retry, and a
 * rejected token was already refreshed and retried inside apiFetch.
 */
export function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_MS.list,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
    },
  });
}
