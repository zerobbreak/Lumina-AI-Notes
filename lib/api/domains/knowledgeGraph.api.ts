import { apiFetch } from "@/lib/api/client";
import { apiPath } from "@/lib/api/path";
import type { KnowledgeGraphDto } from "@/types/api/knowledgeGraph";

export const knowledgeGraphApi = {
  getGraph(token: string) {
    return apiFetch<KnowledgeGraphDto>(apiPath`/knowledge-graph`, { token });
  },
};
