import type { StrategyGraphEdge, StrategyGraphNode } from '@/lib/strategy-graph-types';
import simpleEmaCrossover from '@/lib/strategies/simple-ema-crossover.json';

export type StrategyGraphDocument = {
  nodes: StrategyGraphNode[];
  edges: StrategyGraphEdge[];
};

function cloneGraph(doc: StrategyGraphDocument): StrategyGraphDocument {
  return {
    nodes: doc.nodes.map((n) => ({
      ...n,
      position: n.position ? { ...n.position } : { x: 0, y: 0 },
      config: { ...n.config },
    })),
    edges: doc.edges.map((e) => ({ ...e })),
  };
}

export function getEmaCrossoverTemplate(): StrategyGraphDocument {
  return cloneGraph(simpleEmaCrossover as StrategyGraphDocument);
}

export function emptyStrategyGraph(): StrategyGraphDocument {
  return { nodes: [], edges: [] };
}
