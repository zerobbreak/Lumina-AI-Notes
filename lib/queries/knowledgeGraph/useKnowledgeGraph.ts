"use client";

import { useQuery } from "@tanstack/react-query";
import { knowledgeGraphApi } from "@/lib/api/domains/knowledgeGraph.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { knowledgeGraphKeys } from "@/lib/query-keys/knowledgeGraph";

export function useKnowledgeGraph(enabled = true) {
  const { getApiToken, isReady } = useApiToken();

  return useQuery({
    queryKey: knowledgeGraphKeys.graph(),
    queryFn: async () => {
      const token = await getApiToken();
      return knowledgeGraphApi.getGraph(token);
    },
    enabled: isReady && enabled,
  });
}
