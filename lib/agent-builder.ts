/**
 * Agent builder utilities, types, and constants
 */

export type StrategyType = 'SPOT' | 'DCA' | 'SNIPER' | 'MARGIN' | 'MEME' | 'ARBITRAGE' | 'VISUAL';

export interface AgentConfig {
  name: string;
  strategy_type: StrategyType;
  token_pair: string;
  trigger: string;
  position_size: number;
  stop_loss_pct: number;
  strategy_graph?: string;
}

export interface DeployedAgent extends AgentConfig {
  id: string;
  is_active: boolean;
  status: string;
  created_at: string;
}

export const SUPPORTED_STRATEGIES: Record<StrategyType, string> = {
  SPOT: 'Spot Trading - Buy and sell at market prices',
  DCA: 'Dollar Cost Averaging - Buy fixed amounts at intervals',
  SNIPER: 'Sniper - Catch sudden price movements',
  MARGIN: 'Margin Trading - Trade with leverage',
  MEME: 'Meme Tokens - High volatility trading',
  ARBITRAGE: 'Arbitrage - Exploit price differences',
  VISUAL: 'Visual Strategy - Build custom strategy graph',
};

export const COMMON_TOKEN_PAIRS = [
  'BTC/USD',
  'ETH/USD',
  'XRP/USD',
  'ADA/USD',
  'DOGE/USD',
  'SOL/USD',
  'MATIC/USD',
  'AVAX/USD',
];

export const TRIGGER_EXAMPLES: Record<string, string> = {
  PRICE_DROP_5PCT: 'Trigger when price drops 5%',
  PRICE_DROP_10PCT: 'Trigger when price drops 10%',
  PRICE_RISE_5PCT: 'Trigger when price rises 5%',
  INTERVAL_1H: 'Trigger every 1 hour (DCA)',
  INTERVAL_4H: 'Trigger every 4 hours (DCA)',
  INTERVAL_24H: 'Trigger every 24 hours (DCA)',
};

/**
 * Deploy a new trading agent via API
 */
export async function deployAgent(config: AgentConfig): Promise<DeployedAgent> {
  const response = await fetch('/api/agents/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deploy agent');
  }

  const data = await response.json();
  return data.agent as DeployedAgent;
}
