export const knowledgeGraphKeys = {
  all: ["knowledge-graph"] as const,
  graph: () => [...knowledgeGraphKeys.all, "graph"] as const,
};
