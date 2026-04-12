/**
 * Kraken data via local Node bridge (WSL CLI is not callable from the browser).
 * POST JSON to service root: `{ "command": "price", "args": "<TOKEN_SYMBOL>" }` → `{ success, output }`.
 * @see agent-runner/kraken_http.py (same contract for Python agents).
 */
export const DATA_UNAVAILABLE = 'DATA_UNAVAILABLE';

export interface PriceResult {
  success: boolean;
  price: number;
  rawOutput: string;
  error?: string;
}

export interface SpotMetrics {
  symbol: string;
  label: string;
  price: number | null;
  volume24h: number | null;
  error?: string;
}

export function getKrakenEndpoint(): string {
  const base = (process.env.NEXT_PUBLIC_KRAKEN_API_URL || 'http://localhost:4000').replace(/\/$/, '');
  const path = (process.env.NEXT_PUBLIC_KRAKEN_API_PATH || '').trim();
  if (!path || path === '/') {
    return base;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

type KrakenProxyJson = {
  success?: boolean;
  output?: string;
  error?: string;
};

export async function callKraken(command: string, args: string): Promise<KrakenProxyJson> {
  const response = await fetch(getKrakenEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args }),
  });

  const text = await response.text();
  let data: KrakenProxyJson = {};
  try {
    data = JSON.parse(text) as KrakenProxyJson;
  } catch {
    data = { success: false, output: text, error: 'Invalid JSON from Kraken proxy' };
  }

  if (!response.ok) {
    return { success: false, output: text, error: `HTTP ${response.status}` };
  }

  return data;
}

function parseTickerOutput(output: string): { price: number | null; volume24h: number | null } {
  if (!output) {
    return { price: null, volume24h: null };
  }

  try {
    const data = JSON.parse(output) as Record<string, unknown>;
    const pickTicker = (obj: Record<string, unknown>) => {
      const keys = Object.keys(obj);
      const first = keys.length ? (obj[keys[0]] as Record<string, unknown> | undefined) : undefined;
      if (first && typeof first === 'object') {
        return first;
      }
      return obj;
    };

    const ticker = pickTicker(data) as Record<string, unknown>;
    let price: number | null = null;
    let volume24h: number | null = null;

    const c = ticker.c;
    if (Array.isArray(c) && c.length > 0) {
      const n = Number(c[0]);
      if (!Number.isNaN(n) && n > 0) {
        price = n;
      }
    }
    const v = ticker.v;
    if (Array.isArray(v) && v.length > 1) {
      const n = Number(v[1]);
      if (!Number.isNaN(n) && n >= 0) {
        volume24h = n;
      }
    } else if (Array.isArray(v) && v.length === 1) {
      const n = Number(v[0]);
      if (!Number.isNaN(n) && n >= 0) {
        volume24h = n;
      }
    }

    if (price == null && ticker.last != null) {
      const n = Number(ticker.last);
      if (!Number.isNaN(n) && n > 0) {
        price = n;
      }
    }

    if (volume24h == null && ticker.vol != null) {
      const n = Number(ticker.vol);
      if (!Number.isNaN(n) && n >= 0) {
        volume24h = n;
      }
    }

    return { price, volume24h };
  } catch {
    const price = extractPrice(output);
    return { price: price > 0 ? price : null, volume24h: null };
  }
}

export async function getSpotMetrics(
  label: string,
  options: { priceArgs: string[]; tickerArgs: string[] },
): Promise<SpotMetrics> {
  for (const tickerArg of options.tickerArgs) {
    try {
      const data = await callKraken('ticker', tickerArg);
      if (data.success && data.output) {
        const parsed = parseTickerOutput(data.output);
        if (parsed.price != null || parsed.volume24h != null) {
          return {
            symbol: label,
            label,
            price: parsed.price,
            volume24h: parsed.volume24h,
          };
        }
      }
    } catch {
      // try next ticker pair
    }
  }

  for (const priceArg of options.priceArgs) {
    const pr = await getPrice(priceArg, 2);
    if (pr.success && pr.price > 0) {
      return {
        symbol: label,
        label,
        price: pr.price,
        volume24h: null,
      };
    }
  }

  return {
    symbol: label,
    label,
    price: null,
    volume24h: null,
    error: 'Unable to load from Kraken proxy',
  };
}

const DEFAULT_SPOT_PAIRS: Record<string, { priceArgs: string[]; tickerArgs: string[] }> = {
  BTC: { priceArgs: ['BTC', 'XBTUSD', 'XXBTZUSD'], tickerArgs: ['XXBTZUSD', 'XBTUSD'] },
  ETH: { priceArgs: ['ETH', 'ETHUSD', 'XETHZUSD'], tickerArgs: ['XETHZUSD', 'ETHUSD'] },
  SOL: { priceArgs: ['SOL', 'SOLUSD'], tickerArgs: ['SOLUSD', 'SOL/USD'] },
};

export async function fetchBtcEthSolSpot(): Promise<SpotMetrics[]> {
  const keys = ['BTC', 'ETH', 'SOL'] as const;
  const results = await Promise.all(
    keys.map((k) => getSpotMetrics(k, DEFAULT_SPOT_PAIRS[k])),
  );
  return results;
}

export async function getPrice(symbol: string, maxRetries = 3): Promise<PriceResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await callKraken('price', symbol);

      if (!data.success) {
        throw new Error(`API error: ${data.output || data.error || 'Unknown'}`);
      }

      const rawOutput = data.output || '';
      const price = extractPrice(rawOutput);

      if (price > 0) {
        return { success: true, price, rawOutput };
      }
      throw new Error(`Invalid price '${rawOutput}'`);
    } catch (e) {
      if (attempt === maxRetries) {
        return { success: false, price: 0, rawOutput: '', error: DATA_UNAVAILABLE };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return { success: false, price: 0, rawOutput: '', error: DATA_UNAVAILABLE };
}

function extractPrice(output: string): number {
  if (!output) return 0;

  try {
    const data = JSON.parse(output) as Record<string, unknown>;
    for (const key of ['last', 'c', 'price', 'ask']) {
      if (data[key]) {
        const val = data[key];
        const num = Number(Array.isArray(val) ? val[0] : val);
        if (!Number.isNaN(num) && num > 0) return num;
      }
    }
    for (const v of Object.values(data)) {
      if (typeof v === 'object' && v !== null) {
        const o = v as Record<string, unknown>;
        for (const key of ['last', 'c']) {
          if (o[key]) {
            const val = o[key];
            const num = Number(Array.isArray(val) ? val[0] : val);
            if (!Number.isNaN(num) && num > 0) return num;
          }
        }
      }
    }
  } catch {
    // fall through
  }

  const matches = output.match(/\d+\.?\d*/g) || [];
  for (const f of matches.slice(-3)) {
    const price = Number(f);
    if (price > 1 && price < 1000000) return price;
  }

  return 0;
}
