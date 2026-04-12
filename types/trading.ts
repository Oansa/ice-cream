import type { RunningAgent, AgentStatus } from '@/data/dashboard/mock-data';

export interface SimulatedAgent extends RunningAgent {
  currentAction: 'BUY' | 'SELL' | 'HOLD';
  pnlPct: number;
  totalBalanceUsd: number;
  portfolioValueUsd: number;
  cashUsd: number;
  trackedToken: string;
  tradesCount: number;
}

export interface TradingState {
  totalBalanceUsd: number;
  pnlUsd: number;
  pnlPct: number;
  agents: SimulatedAgent[];
  isLoading: boolean;
  error: string | null;
}

export type TradingAction = 'BUY' | 'SELL' | 'HOLD';

