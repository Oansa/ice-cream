import { NextResponse, NextRequest } from 'next/server';

/**
 * Market price endpoint for trading agents
 * 
 * Fetches current market prices for cryptocurrency pairs
 * Used by agents to make trading decisions and execute trades on Sepolia
 * 
 * Usage:
 *   POST /api/market/price
 *   Body: { "symbol": "ETH", "pair": "ETH/USD" }
 *   
 * Response:
 *   { "success": true, "symbol": "ETH", "pair": "ETH/USD", "price": 2345.67, "timestamp": 1712973600000 }
 */

interface PriceRequest {
  symbol: string;  // e.g., "ETH", "BTC"
  pair?: string;   // e.g., "ETH/USD", "BTC/USDT"
}

interface PriceResponse {
  success: boolean;
  symbol?: string;
  pair?: string;
  price?: number;
  timestamp?: number;
  source?: string;
  error?: string;
}

/**
 * Fetch price from Kraken HTTP bridge (WSL)
 * Falls back to public API if bridge is unavailable
 */
async function fetchFromKrakenBridge(symbol: string): Promise<number | null> {
  try {
    const response = await fetch('http://localhost:4000/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'price', args: symbol }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(
        `Kraken bridge returned ${response.status}, trying fallback...`
      );
      return null;
    }

    const data = await response.json();
    if (data.success && data.output) {
      // Parse numeric price from output
      const price = parseFloat(data.output);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  } catch (error) {
    console.warn('Kraken bridge unavailable:', error);
  }
  return null;
}

/**
 * Fetch price from CoinGecko (free, no auth required)
 */
async function fetchFromCoinGecko(symbol: string): Promise<number | null> {
  try {
    // Map common symbols to CoinGecko IDs
    const coinMap: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      SOL: 'solana',
      XRP: 'ripple',
      ADA: 'cardano',
      DOGE: 'dogecoin',
      USDT: 'tether',
      USDC: 'usd-coin',
    };

    const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase();

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = data[coinId]?.usd;

    if (price && typeof price === 'number' && price > 0) {
      return price;
    }
  } catch (error) {
    console.warn('CoinGecko API failed:', error);
  }
  return null;
}

/**
 * Fetch price from Binance API (free, no auth required)
 */
async function fetchFromBinance(symbol: string): Promise<number | null> {
  try {
    // Map symbols to Binance trading pairs
    const pair = `${symbol.toUpperCase()}USDT`;

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = parseFloat(data.price);

    if (!isNaN(price) && price > 0) {
      return price;
    }
  } catch (error) {
    console.warn('Binance API failed:', error);
  }
  return null;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as PriceRequest;
    const { symbol, pair } = body;

    if (!symbol) {
      return NextResponse.json<PriceResponse>(
        { success: false, error: 'Missing symbol parameter' },
        { status: 400 }
      );
    }

    // Try to fetch price in order of preference
    // 1. Kraken CLI bridge (most accurate for trading)
    let price = await fetchFromKrakenBridge(symbol);

    // 2. Fallback to Binance (most liquid exchange)
    if (price === null) {
      price = await fetchFromBinance(symbol);
    }

    // 3. Final fallback to CoinGecko
    if (price === null) {
      price = await fetchFromCoinGecko(symbol);
    }

    if (price === null) {
      return NextResponse.json<PriceResponse>(
        {
          success: false,
          symbol,
          error: `Unable to fetch price for ${symbol}`,
        },
        { status: 503 }
      );
    }

    const response: PriceResponse = {
      success: true,
      symbol,
      pair: pair || `${symbol}/USD`,
      price,
      timestamp: Date.now(),
      source: 'market-data-api',
    };

    return NextResponse.json(response, {
      headers: {
        // Cache for 30 seconds to avoid rate limits
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json<PriceResponse>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  // Parse query string: ?symbol=ETH&pair=ETH/USD
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const pair = searchParams.get('pair') || undefined;

  if (!symbol) {
    return NextResponse.json<PriceResponse>(
      { success: false, error: 'Missing symbol query parameter' },
      { status: 400 }
    );
  }

  // Convert GET to POST for reuse
  return POST(
    new NextRequest(request, {
      method: 'POST',
      body: JSON.stringify({ symbol, pair }),
    })
  );
}
