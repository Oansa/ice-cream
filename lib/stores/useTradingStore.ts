import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
// import type { SimulatedAgent } from '@/types/trading';
interface SimulatedAgent {
  id: string;
  name: string;
  tradingPair: string;
  status: string;
  currentAction: string;
  pnlUsd: number;
  pnlPct: number;
  totalBalanceUsd: number;
  portfolioValueUsd: number;
  cashUsd: number;
  trackedToken: string;
  tradesCount: number;
}
import { getPrice } from '@/lib/krakenApi';

import { supabaseClient } from '@/lib/supabase';
const supabase = supabaseClient;
import { ethers } from 'ethers';

interface TradingStore {
  totalBalanceUsd: number;
  pnlUsd: number;
  pnlPct: number;
  agents: SimulatedAgent[];
  isLoading: boolean;
  error: string | null;

  // Web3 wallet state
  web3Connected: boolean;
  web3Address: string | null;
  web3BalanceEth: string;

  fetchAgents: () => Promise<void>;
  toggleAgent: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<SimulatedAgent>) => void;
  refreshPrices: () => Promise<void>;

  // Web3 actions
  setWeb3Connected: (connected: boolean, address: string | null, balance?: string) => void;
  fetchWalletBalance: (provider: ethers.BrowserProvider) => Promise<void>; // provider from useWeb3
}

const ETH_PRICE_USD = 3500; // Mock, can fetch from krakenApi.getPrice('XETHZUSD')

const useTradingStore = create<TradingStore>()(
  devtools(
    (set, get) => ({
      totalBalanceUsd: 500,
      pnlUsd: 0,
      pnlPct: 0,
      agents: [],
      isLoading: false,
      error: null,

      // Web3
      web3Connected: false,
      web3Address: null,
      web3BalanceEth: '0 ETH',

      fetchAgents: async () => {
        set({ isLoading: true, error: null });
        try {
          // Use the /api/agents/live endpoint which properly joins agent_stats with agents table
          const response = await fetch('/api/agents/live');
          
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const result = await response.json();
          const agents: SimulatedAgent[] = result.agents || [];

          set({ 
            agents,
            totalBalanceUsd: result.summary?.totalBalanceUsd || 0,
            pnlUsd: result.summary?.pnlUsd || 0,
            pnlPct: result.summary?.pnlPct || 0,
            isLoading: false 
          });
        } catch (e) {
          set({ 
            isLoading: false, 
            error: `Failed to fetch agents: ${String(e)}`,
            agents: []
          });
        }
      },

      toggleAgent: (agentId: string) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { 
              ...agent, 
              status: agent.status === 'active' ? 'paused' : 'active' 
            } : agent
          )
        }));
      },
      updateAgent: (agentId, updates) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, ...updates } : agent
          )
        }));
      },

      refreshPrices: async () => {
        const { agents } = get();
        for (const agent of agents) {
          const priceResult = await getPrice(agent.trackedToken);
          if (priceResult.success) {
            get().updateAgent(agent.id, { /* updated fields */ });
          }
        }
      },

      setWeb3Connected: (connected, address, balance = '0 ETH') => set({
        web3Connected: connected,
        web3Address: address,
        web3BalanceEth: balance
      }),

      fetchWalletBalance: async (provider: ethers.BrowserProvider) => {
        try {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const balanceWei = await provider.getBalance(address);
          const balanceEth = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
          set({ web3BalanceEth: `${balanceEth} ETH` });
        } catch (error) {
          console.error('Failed to fetch wallet balance:', error);
          set({ web3BalanceEth: '0 ETH' });
        }
      },
    }),
    { name: 'trading-store' }
  )
);

export default useTradingStore;

