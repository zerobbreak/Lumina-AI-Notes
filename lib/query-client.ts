import { QueryClient } from "@tanstack/react-query";
import { STALE_MS } from "@/lib/queries/polling";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_MS.list,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
    },
  });
}
