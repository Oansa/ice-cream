'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import type { SavedAgentDraftInput } from '@/lib/saved-agents';

type SaveProducer = () => SavedAgentDraftInput | null;

type AgentBuilderSaveContextValue = {
  registerSave: (producer: SaveProducer | null) => void;
  captureSavePayload: () => SavedAgentDraftInput | null;
};

const AgentBuilderSaveContext = createContext<AgentBuilderSaveContextValue | null>(null);

export function AgentBuilderSaveProvider({ children }: { children: ReactNode }) {
  const producerRef = useRef<SaveProducer | null>(null);

  const registerSave = useCallback((producer: SaveProducer | null) => {
    producerRef.current = producer;
  }, []);

  const captureSavePayload = useCallback(() => producerRef.current?.() ?? null, []);

  const value = useMemo(
    () => ({ registerSave, captureSavePayload }),
    [registerSave, captureSavePayload]
  );

  return (
    <AgentBuilderSaveContext.Provider value={value}>{children}</AgentBuilderSaveContext.Provider>
  );
}

export function useAgentBuilderSave(): AgentBuilderSaveContextValue {
  const ctx = useContext(AgentBuilderSaveContext);
  if (!ctx) {
    throw new Error('useAgentBuilderSave must be used within AgentBuilderSaveProvider');
  }
  return ctx;
}
