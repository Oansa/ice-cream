import { v4 as uuidv4 } from 'uuid';

import type { StrategyType } from '@/lib/agent-builder';
import type { StrategyGraphEdge, StrategyGraphNode } from '@/lib/strategy-graph-types';

const STORAGE_KEY = 'mevolut_saved_agents_v1';

export type SavedAgentRecord = {
  id: string;
  savedAt: string;
  title: string;
  mode: 'form' | 'drag';
  name: string;
  strategy_type: StrategyType;
  token_pair: string;
  trigger: string;
  position_size: string;
  stop_loss_pct: string;
  strategy_graph_json: string;
  graph_nodes?: StrategyGraphNode[];
  graph_edges?: StrategyGraphEdge[];
};

export type SavedAgentDraftInput = Omit<SavedAgentRecord, 'id' | 'savedAt' | 'title'>;

function isRecord(x: unknown): x is SavedAgentRecord {
  if (!x || typeof x !== 'object') {
    return false;
  }
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.savedAt === 'string' &&
    typeof o.title === 'string' &&
    (o.mode === 'form' || o.mode === 'drag') &&
    typeof o.name === 'string'
  );
}

export function listSavedAgents(): SavedAgentRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRecord);
  } catch {
    return [];
  }
}

export function getSavedAgent(id: string): SavedAgentRecord | null {
  return listSavedAgents().find((a) => a.id === id) ?? null;
}

export function persistSavedAgent(record: SavedAgentRecord): void {
  if (typeof window === 'undefined') {
    return;
  }
  const rest = listSavedAgents().filter((a) => a.id !== record.id);
  rest.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

export function deleteSavedAgent(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const rest = listSavedAgents().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
}

export function createSavedAgentRecord(
  input: SavedAgentDraftInput,
  title: string,
  existingId?: string
): SavedAgentRecord {
  const id = existingId ?? uuidv4();
  return {
    id,
    savedAt: new Date().toISOString(),
    title: title.trim() || input.name.trim() || 'Untitled agent',
    ...input,
  };
}
