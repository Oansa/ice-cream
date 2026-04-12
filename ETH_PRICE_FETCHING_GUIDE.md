# 🚀 ETH Price Fetching Guide for Sepolia Agents

Your trading agents can now fetch real-time ETH (and other cryptocurrency) prices via the unified market data API.

---

## 📊 Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| **API Endpoint** | `/api/market/price` | Fetches market prices via POST/GET |
| **TypeScript Utility** | `/lib/market-data.ts` | Client for use in frontend/React agents |
| **Python Utility** | `/agent-runner/market_data_client.py` | Client for Python agent runner |

**Fallback Chain:**
1. ✅ Kraken CLI bridge (`http://localhost:4000/`)
2. ✅ Binance API (most liquid)
3. ✅ CoinGecko API (reliable, free)

---

## 🔌 API Endpoint

### POST `/api/market/price`

Fetch market price for a cryptocurrency symbol.

**Request:**
```json
{
  "symbol": "ETH",
  "pair": "ETH/USD"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "symbol": "ETH",
  "pair": "ETH/USD",
  "price": 2181.32,
  "timestamp": 1776006265028,
  "source": "market-data-api"
}
```

**Example with curl:**
```bash
curl -X POST http://localhost:3000/api/market/price \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ETH"}'
```

---

## 📱 TypeScript/React Usage

Use in your React components or Next.js server code.

### Simple Price Fetch

```typescript
import { getMarketPrice } from '@/lib/market-data';

// In a React component or server function
const price = await getMarketPrice('ETH');

if (price.success) {
  console.log(`ETH: $${price.price}`);
  console.log(`Fetched at: ${new Date(price.timestamp).toISOString()}`);
} else {
  console.error(price.error);
}
```

### With Retry Logic

```typescript
import { getMarketPriceWithRetry } from '@/lib/market-data';

// Retry up to 3 times with 1 second delay
const price = await getMarketPriceWithRetry('ETH', 3, 1000);

if (price.success) {
  console.log(`ETH: $${price.price}`);
}
```

### In React Component

```typescript
import React, { useState, useEffect } from 'react';
import { getMarketPrice, MarketPrice } from '@/lib/market-data';

export function ETHPriceDisplay() {
  const [price, setPrice] = useState<MarketPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const result = await getMarketPrice('ETH');
        if (result.success) {
          setPrice(result);
          setError(null);
        } else {
          setError(result.error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return price ? (
    <div>
      <h2>ETH Price: ${price.price.toFixed(2)}</h2>
      <p>Last updated: {new Date(price.timestamp).toLocaleTimeString()}</p>
    </div>
  ) : null;
}
```

### Trading Decision Logic

```typescript
import { getMarketPrice, simplePriceDecision } from '@/lib/market-data';

async function executeAgentLogic(entryPrice: number) {
  const price = await getMarketPrice('ETH');
  
  if (!price.success) {
    console.error('Failed to fetch price:', price.error);
    return;
  }

  const decision = simplePriceDecision(price.price, entryPrice);
  
  console.log(`Action: ${decision.action}`);
  console.log(`Confidence: ${decision.confidence}%`);
  console.log(`Reason: ${decision.reason}`);
  
  // Execute trade based on decision...
  await executeTrade(decision);
}
```

---

## 🐍 Python Agent Runner Usage

Use in your agent runner to fetch prices for trading decisions.

### Simple Price Fetch

```python
import asyncio
from market_data_client import get_market_price

async def main():
    price = await get_market_price('ETH')
    
    if price.success:
        print(f'ETH: ${price.price}')
    else:
        print(f'Error: {price.error}')

asyncio.run(main())
```

### Using the Client Class

```python
import asyncio
from market_data_client import MarketDataClient

async def main():
    async with MarketDataClient('http://localhost:3000') as client:
        # Single price
        eth = await client.get_price('ETH')
        if eth.success:
            print(f'ETH: ${eth.price}')
        
        # Multiple prices concurrently
        prices = await client.get_prices(['BTC', 'ETH', 'SOL'])
        for symbol, price in prices.items():
            if price.success:
                print(f'{symbol}: ${price.price}')

asyncio.run(main())
```

### Integration with Agent

```python
import asyncio
from market_data_client import MarketDataClient

class TradingAgent:
    def __init__(self, token_pair: str = 'ETH/USD'):
        self.token_pair = token_pair
        self.symbol = token_pair.split('/')[0]
    
    async def get_current_price(self) -> float:
        """Fetch current market price for the agent's trading pair"""
        async with MarketDataClient() as client:
            price = await client.get_price(
                self.symbol,
                pair=self.token_pair,
                max_retries=3
            )
            if price.success:
                return price.price
            else:
                raise Exception(f'Failed to fetch price: {price.error}')
    
    async def calculate_trade_signal(self, entry_price: float) -> str:
        """Use current price to determine trading action"""
        try:
            current_price = await self.get_current_price()
            price_change_pct = ((current_price - entry_price) / entry_price) * 100
            
            if price_change_pct > 5:
                return 'SELL'  # Take profits
            elif price_change_pct < -3:
                return 'BUY'   # Buy the dip
            else:
                return 'HOLD'
        except Exception as e:
            print(f'Error calculating signal: {e}')
            return 'HOLD'
    
    async def run(self):
        """Main agent execution loop"""
        print(f'🤖 Agent trading {self.token_pair} started...')
        
        entry_price = await self.get_current_price()
        print(f'Entry price: ${entry_price}')
        
        while True:
            signal = await self.calculate_trade_signal(entry_price)
            print(f'Signal: {signal}')
            
            # Execute trade here based on signal
            await asyncio.sleep(60)  # Check every minute

# Run the agent
if __name__ == '__main__':
    agent = TradingAgent('ETH/USD')
    asyncio.run(agent.run())
```

---

## 🔗 Deploying to Sepolia

When deploying your smart contract agent on Sepolia:

### 1. **Contract Calls from Off-Chain Bot**

Your bot (Python or JavaScript) runs off-chain and:
1. Fetches ETH price via the API (`/api/market/price`)
2. Calculates trading signal
3. Calls smart contract functions to execute trades

```solidity
// TradingAgent.sol
function executeTrade(
    Types.TradeDirection direction,
    uint256 amount,
    uint256 currentPrice
) external onlyExecutor {
    // Execute trade on Sepolia
    // Bot provides currentPrice fetched from /api/market/price
}
```

### 2. **Bot Code Pattern**

```python
# agent-runner/agent.py or similar
async def trading_loop():
    agent_contract = w3.eth.contract(address=AGENT_ADDRESS, abi=AGENT_ABI)
    
    async with MarketDataClient() as client:
        while True:
            # Fetch current ETH price
            price = await client.get_price('ETH')
            
            if price.success:
                # Calculate trading decision
                should_trade = analyze_signal(price.price)
                
                if should_trade:
                    # Call smart contract to execute trade on Sepolia
                    tx = agent_contract.functions.executeTrade(
                        direction=DIRECTION_BUY,
                        amount=amount,
                        currentPrice=int(price.price * 1e8)
                    ).transact({'from': BOT_WALLET})
                    
                    # Wait for confirmation
                    receipt = w3.eth.wait_for_transaction_receipt(tx)
                    print(f'Trade executed: {receipt.transactionHash.hex()}')
            
            await asyncio.sleep(60)  # Check every minute
```

---

## 🧪 Testing

### Test the Endpoint

```bash
# GET request
curl http://localhost:3000/api/market/price?symbol=ETH

# POST request  
curl -X POST http://localhost:3000/api/market/price \
  -H "Content-Type: application/json" \
  -d '{"symbol":"ETH","pair":"ETH/USD"}'
```

### Test Python Client

```bash
cd agent-runner
python3 -m market_data_client
```

---

## ⚠️ Important Notes

1. **Rate Limits**: The API caches responses for 30 seconds to avoid rate limiting
2. **Fallback Chain**: If Kraken bridge is down, the API automatically tries Binance, then CoinGecko
3. **Retries**: Both Python and TypeScript clients support automatic retries
4. **No Data Fabrication**: If all sources fail, the API returns an error—never a fake price

---

## 🚨 Troubleshooting

### "Cannot fetch price"

Check the fallback chain:
1. Is `/api/market/price` endpoint running? (check Next.js server)
2. Can the server reach Binance API?
3. Can the server reach CoinGecko API?

### "Kraken bridge unavailable"

The local Kraken HTTP bridge at `localhost:4000` isn't available. The API will automatically fall back to Binance/CoinGecko—no manual action needed.

### "Market price too stale"

The API caches for 30 seconds. If you need fresher data, make requests further apart or bypass caching with a `no-cache` header.

---

## 📚 Related Files

- [`/app/api/market/price/route.ts`](../app/api/market/price/route.ts) - API endpoint
- [`/lib/market-data.ts`](../lib/market-data.ts) - TypeScript client
- [`/agent-runner/market_data_client.py`](../agent-runner/market_data_client.py) - Python client
- [`/contracts/TradingAgent.sol`](../contracts/TradingAgent.sol) - Smart contract

---

**Your agents are now ready to make trades on Sepolia with real-time ETH prices! 🎉**
