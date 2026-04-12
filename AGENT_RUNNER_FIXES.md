# 🔧 Agent Runner Fixes Applied

## Issues Fixed

### 1. **HTTP 404: Cannot POST /**
- **Problem**: Agents were trying to fetch prices from the old Kraken HTTP bridge at `http://localhost:4000/`, which was returning 404
- **Solution**: Updated agents to use the new market data API at `http://localhost:3000/api/market/price`

### 2. **Database Schema Errors**
- **Problem**: `agent_stats` table was missing `current_action`, `status`, `total_balance`, `portfolio_value`, `pnl_pct` columns
- **Solution**: Created migration `002_add_agent_stats_columns.sql` to add these columns

---

## Changes Made

### Files Updated

1. **agent-runner/agent.py**
   - ❌ Removed: `from kraken_http import KrakenHTTP, DATA_UNAVAILABLE, token_pair_to_price_symbol`
   - ✅ Added: `from market_data_client import MarketDataClient, MarketPrice`
   - ✅ Replaced `self.kraken_http = KrakenHTTP()` with `self.market_data_client = MarketDataClient("http://localhost:3000")`
   - ✅ Updated `run_cycle()` to use `market_data_client.get_price()`
   - ✅ Updated `_get_ticker_data()` to use `market_data_client.get_price()`

2. **agent-runner/runner.py**
   - ❌ Removed: `from kraken_http import DATA_UNAVAILABLE, KrakenHTTP`
   - ✅ Added: `from market_data_client import MarketDataClient`
   - ✅ Updated bridge validation to probe `http://localhost:3000/api/market/price` instead of `http://localhost:4000/`

3. **supabase/migrations/002_add_agent_stats_columns.sql** (NEW)
   - Adds missing columns to `agent_stats` table:
     - `current_action` (BUY|SELL|HOLD)
     - `status` (RUNNING|PAUSED|STOPPED|ERROR)
     - `total_balance` (portfolio value in USD)
     - `portfolio_value` (holdings value)
     - `pnl_pct` (profit/loss percentage)

---

## Next Steps

### 1. Apply Database Migration

You must apply the Supabase migration to update the schema:

```bash
# Option 1: Using Supabase CLI
cd supabase
supabase migration up

# Option 2: Via Supabase dashboard
# Copy contents of migrations/002_add_agent_stats_columns.sql
# Run in Supabase SQL editor
```

Or manually run this SQL in Supabase SQL editor:
```sql
ALTER TABLE public.agent_stats 
ADD COLUMN IF NOT EXISTS current_action TEXT DEFAULT 'HOLD' CHECK (current_action IN ('BUY','SELL','HOLD'));

ALTER TABLE public.agent_stats 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','PAUSED','STOPPED','ERROR'));

ALTER TABLE public.agent_stats 
ADD COLUMN IF NOT EXISTS total_balance NUMERIC DEFAULT 500;

ALTER TABLE public.agent_stats 
ADD COLUMN IF NOT EXISTS portfolio_value NUMERIC DEFAULT 0;

ALTER TABLE public.agent_stats 
ADD COLUMN IF NOT EXISTS pnl_pct NUMERIC DEFAULT 0;
```

### 2. Test the Agent Runner

```bash
# Ensure Next.js server is running on localhost:3000
npm run dev

# In another terminal, start the agent runner
cd agent-runner
python main.py
```

---

## Architecture Now

```
Agent Runner (Python)
    ↓
Market Data Client (market_data_client.py)
    ↓
HTTP POST localhost:3000/api/market/price
    ↓
Next.js API Route Handler
    ├→ Kraken CLI bridge (if available)
    ├→ Binance API (fallback)
    └→ CoinGecko API (final fallback)
    ↓
Real-time cryptocurrency prices
```

---

## Verification Checklist

- ✅ No Python import errors in agent.py
- ✅ No Python import errors in runner.py
- ✅ No references to deprecated `kraken_http` module
- ✅ Market data client properly initialized in agents
- ❌ **TODO**: Apply Supabase migration
- ❌ **TODO**: Test agent runner

---

## If Issues Persist

1. **Agents still failing?**
   - Check that Next.js server is running on `localhost:3000`
   - Check `/api/market/price` endpoint is responding (test with curl)
   - Check agent runner logs for specific error messages

2. **Database errors?**
   - Confirm migration was applied
   - Verify columns exist in `agent_stats` table in Supabase

3. **Price data unavailable?**
   - Ensure at least one price source is accessible (Binance/CoinGecko)
   - Check `/api/market/price` endpoint for errors

---

**Status: Ready for testing after database migration is applied** ✅
