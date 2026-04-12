export type StrategyGraphNode = {
  id: string;
  defId: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

export type StrategyGraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
};
