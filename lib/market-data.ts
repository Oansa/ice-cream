/**
 * Market data utilities for trading agents
 * 
 * Provides functions for agents to fetch real-time market prices
 * Used when agents are deployed on Sepolia to make trading decisions
 */

export interface MarketPrice {
  success: boolean;
  symbol: string;
  pair: string;
  price: number;
  timestamp: number;
  source: string;
}

export interface FetchPriceError {
  success: false;
  symbol: string;
  error: string;
}

export type PriceResult = MarketPrice | FetchPriceError;

/**
 * Fetch current market price for a cryptocurrency symbol
 * 
 * @param symbol - Cryptocurrency symbol (e.g., "ETH", "BTC")
 * @param pair - Optional trading pair (e.g., "ETH/USD"). Defaults to symbol/USD
 * @param baseUrl - API base URL. Defaults to current origin
 * @returns Market price data or error
 * 
 * @example
 * const price = await getMarketPrice("ETH");
 * if (price.success) {
 *   console.log(`ETH price: $${price.price}`);
 * }
 */
export async function getMarketPrice(
  symbol: string,
  pair?: string,
  baseUrl?: string
): Promise<PriceResult> {
  try {
    const url = new URL('/api/market/price', baseUrl || typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, pair }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch price`);
    }

    const data = (await response.json()) as PriceResult;
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      symbol,
      error: `Failed to fetch ${symbol} price: ${errorMessage}`,
    };
  }
}

/**
 * Fetch market price with retry logic
 * 
 * @param symbol - Cryptocurrency symbol
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 * @returns Market price data or error after all retries exhausted
 * 
 * @example
 * const price = await getMarketPriceWithRetry("ETH", 3, 1000);
 */
export async function getMarketPriceWithRetry(
  symbol: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<PriceResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await getMarketPrice(symbol);
      if (result.success) {
        return result;
      }
      // result is now FetchPriceError
      const errorResult = result as FetchPriceError;
      lastError = new Error(errorResult.error || 'Unknown error');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Don't wait after final attempt
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    success: false,
    symbol,
    error: `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
  };
}

/**
 * Calculate trading decisions based on market price
 * 
 * This is a placeholder for agent decision logic
 * Real agents would implement more sophisticated strategies
 */
export interface TradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  reason: string;
  recommendedAmount?: number;
}

/**
 * Example: Simple price-based trading decision
 * 
 * @param currentPrice - Current market price
 * @param entryPrice - Entry price or reference price
 * @returns Trading decision
 */
export function simplePriceDecision(
  currentPrice: number,
  entryPrice: number
): TradeDecision {
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

  if (priceChange > 5) {
    return {
      action: 'SELL',
      confidence: Math.min(100, priceChange * 5),
      reason: `Price up ${priceChange.toFixed(2)}%, taking profits`,
    };
  } else if (priceChange < -3) {
    return {
      action: 'BUY',
      confidence: Math.min(100, Math.abs(priceChange) * 3),
      reason: `Price down ${Math.abs(priceChange).toFixed(2)}%, buying dip`,
    };
  }

  return {
    action: 'HOLD',
    confidence: 50,
    reason: 'Price stable, holding position',
  };
}
