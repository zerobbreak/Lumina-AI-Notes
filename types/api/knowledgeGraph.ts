export type KnowledgeGraphNodeDto = {
  id: string;
  title: string;
  connectionCount: number;
  orphan: boolean;
  cluster: number;
};

export type KnowledgeGraphEdgeDto = {
  source: string;
  target: string;
  type: "wikilink" | "semantic";
  score?: number;
};

export type KnowledgeGraphDto = {
  nodes: KnowledgeGraphNodeDto[];
  edges: KnowledgeGraphEdgeDto[];
};
