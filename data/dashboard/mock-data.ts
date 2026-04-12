export type DashboardNavItem = {
  label: string;
  href: string;
  key:
    | 'dashboard'
    | 'agent-builder'
    | 'agents-library'
    | 'staking'
    | 'orders'
    | 'data-api';
};

export type AgentStatus = 'active' | 'paused';

export type RunningAgent = {
  id: string;
  name: string;
  tradingPair: string;
  status: AgentStatus;
  /** Paper or live P&L in USD (positive = profit). */
  pnlUsd: number;
  currentAction?: 'BUY' | 'SELL' | 'HOLD';
  pnlPct?: number;
};

export type WalletOverview = {
  totalBalanceUsd: number;
  balanceSubtitle: string;
  change24hPct?: number;
  holdings?: { label: string; valueUsd: number }[];
};

export const dashboardNavItems: DashboardNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'agent-builder', label: 'Agent Builder', href: '/agent-builder' },
  { key: 'agents-library', label: "Agent's library", href: '/agents-library' },
  { key: 'staking', label: 'Staking', href: '/dashboard#staking' },
  { key: 'orders', label: 'Orders', href: '/dashboard#orders' },
  { key: 'data-api', label: 'Data API', href: '/dashboard#data-api' },
];

/** Primary wallet summary for the dashboard hero. */
export const walletOverview: WalletOverview = {
  totalBalanceUsd: 12450.32,
  balanceSubtitle: 'Available balance across all agents',
  change24hPct: 2.14,
  holdings: [
    { label: 'USDC', valueUsd: 8420.0 },
    { label: 'BTC', valueUsd: 3210.5 },
    { label: 'ETH', valueUsd: 819.82 },
  ],
};

/** Live agents data from /api/agents/live — static mocks deprecated for live deployment. */
export const runningAgents: RunningAgent[] = [
  {
    id: '1',
    name: 'EMA Crossover Scout',
    tradingPair: 'BTC/USD',
    status: 'active',
    pnlUsd: 482.35,
  },
  {
    id: '2',
    name: 'DCA Accumulator',
    tradingPair: 'ETH/USD',
    status: 'active',
    pnlUsd: -62.1,
  },
  {
    id: '3',
    name: 'Volatility Sentry',
    tradingPair: 'SOL/USD',
    status: 'paused',
    pnlUsd: 0,
  },
  {
    id: '4',
    name: 'Arb Lite',
    tradingPair: 'XRP/USD',
    status: 'active',
    pnlUsd: 128.94,
  },
];
