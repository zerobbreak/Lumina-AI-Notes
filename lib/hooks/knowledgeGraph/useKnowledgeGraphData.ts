"use client";

import { useKnowledgeGraph } from "@/lib/queries/knowledgeGraph/useKnowledgeGraph";

export function useKnowledgeGraphData() {
  const graphRest = useKnowledgeGraph();
  return graphRest.isLoading ? undefined : graphRest.data;
}
