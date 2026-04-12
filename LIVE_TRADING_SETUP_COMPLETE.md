# ✅ Live Trading Setup Complete

Your agents are now ready to trade with **real Sepolia ETH** from your MetaMask wallet!

---

## What's Changed

### 1. **Paper Trading → Live Trading** ✅
- `agent-runner/config.py` - Now has blockchain settings
- Agents will execute trades on Sepolia smart contract instead of simulating

### 2. **Blockchain Wallet Executor** ✅
- `agent-runner/blockchain_wallet.py` - Created smart contract interface
- Handles trade execution via `TradingAgent.sol`
- Tracks on-chain positions and balances

### 3. **Dashboard Updates** ✅
- `WalletOverviewCard` - Shows your **MetaMask Sepolia ETH balance**
- `RunningAgentsSection` - Shows all running agents with live P&L
- Updates from `/api/agents/live` endpoint automatically

### 4. **API Integration** ✅
- Dashboard now fetches agents from `/api/agents/live` 
- Properly joins `agent_stats` with agent details
- Shows real-time status: `RUNNING`, `PAUSED`, etc.
- Shows current action: `BUY`, `SELL`, `HOLD`

---

## What You Need to Do

### Step 1: Get Sepolia ETH
```
1. Go to https://sepoliafaucet.com or https://www.alchemy.com/faucets/ethereum
2. Enter your MetaMask wallet address
3. Request test ETH (0.5 - 1 ETH recommended)
```

### Step 2: Deploy Smart Contract
```bash
# From project root
npx hardhat run scripts/deploy.js --network sepolia

# This deploys TradingAgent.sol and returns the contract address
# Example output: Contract deployed to: 0x1a2b3c...
```

### Step 3: Update Agent Runner Config
```bash
# Edit agent-runner/.env
PAPER_TRADING=false
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v3/YOUR_KEY
TRADING_AGENT_CONTRACT=0x...  # From step 2
```

### Step 4: Connect MetaMask in Dashboard
```
1. Open http://localhost:3000
2. Click wallet icon
3. Click "Connect MetaMask"
4. Approve connection
5. Switch to Sepolia network if prompted
6. Should see your ETH balance
```

### Step 5: Start Agent Runner
```bash
cd agent-runner
python main.py
```

---

## Dashboard Features (Now Live)

### 📊 Wallet Overview Card
```
MetaMask Balance
Sepolia Testnet

✓ Shows your real Sepolia ETH balance
✓ USD conversion (using current Ethereum price)
✓ Connected wallet address
✓ Connection status indicator
```

### 🤖 Running Agents Section
```
Your running agents with:
✓ Agent name and trading pair
✓ Status (RUNNING/PAUSED/STOPPED)
✓ Current action (BUY/SELL/HOLD)
✓ Current P&L in USD
✓ Play/Pause buttons
```

Example agent display:
```
ETH Trader          | Status: RUNNING | Action: BUY  | P&L: +$123.45
BTC Sniper          | Status: PAUSED  | Action: HOLD | P&L: -$50.00
DCA Bot             | Status: RUNNING | Action: SELL | P&L: +$0.00
```

---

## How It Works

### Flow Diagram
```
1. MetaMask Wallet (Sepolia ETH)
   ↓
2. Dashboard shows balance + running agents
   ↓
3. Agent Runner fetches current ETH price
   ↓
4. Agent calculates trading signal
   ↓
5. Agent calls TradingAgent.sol smart contract
   ↓
6. Trade executes on Sepolia blockchain
   ↓
7. Supabase agent_stats updated
   ↓
8. Dashboard refreshes with new P&L
```

### Real-Time Data Flow
```
Agent Runner              Supabase          Dashboard
   ↓                         ↓                 ↓
[Execute Trade]  →  [Update agent_stats]  →  [Show Results]
   ↓                         ↓                 ↓
- current_action             ✓                ✓ BUY/SELL/HOLD
- pnl_usd                    ✓                ✓ +$123.45
- pnl_pct                    ✓                ✓ 2.47%
- total_balance              ✓                ✓ $5,123
- portfolio_value            ✓                ✓ $1,200
- status                     ✓                ✓ RUNNING
```

---

## Database Schema Updated

The Supabase migration added these columns to `agent_stats`:
```sql
✓ current_action TEXT (BUY|SELL|HOLD)
✓ status TEXT (RUNNING|PAUSED|STOPPED|ERROR)
✓ total_balance NUMERIC (USD balance)
✓ portfolio_value NUMERIC (Holdings value)
✓ pnl_pct NUMERIC (Percentage P&L)
```

**If you haven't applied the migration yet:**
```
1. Go to Supabase dashboard
2. SQL Editor
3. Copy/run: supabase/migrations/002_add_agent_stats_columns.sql
```

---

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `agent-runner/config.py` | ✅ Modified | Added blockchain settings |
| `agent-runner/blockchain_wallet.py` | ✅ Created | Smart contract interaction |
| `agent-runner/market_data_client.py` | ✅ Exists | Fetches market prices |
| `lib/stores/useTradingStore.ts` | ✅ Modified | Uses `/api/agents/live` |
| `app/api/agents/live/route.ts` | ✅ Exists | Agent stats endpoint |
| `components/dashboard/wallet-overview-card.tsx` | ✅ Exists | MetaMask balance display |
| `components/dashboard/running-agents-section.tsx` | ✅ Exists | Agents list display |
| `LIVE_TRADING_SEPOLIA.md` | ✅ Created | Comprehensive guide |
| `supabase/migrations/002_add_agent_stats_columns.sql` | ✅ Created | Database schema |

---

## Verification Checklist

Before starting:
```
☐ MetaMask wallet installed and unlocked
☐ Sepolia testnet ETH received (~0.5-1.0 ETH)
☐ Smart contract deployed to Sepolia
☐ Contract address saved in .env
☐ Next.js dev server running (npm run dev)
☐ Dashboard accessible at http://localhost:3000
☐ MetaMask connected in dashboard
☐ Your ETH balance showing in wallet card
☐ Agent runner dependencies installed
☐ Database migration applied
```

---

## Ready to Trade!

```bash
# Terminal 1: Start Next.js server
npm run dev

# Terminal 2: Start agent runner  
cd agent-runner && python main.py
```

**Watch your dashboard:**
- ✅ Wallet balance updates from MetaMask
- ✅ Running agents show live P&L
- ✅ Current action updates in real-time
- ✅ All trades recorded on Sepolia blockchain

---

## Troubleshooting

### Dashboard doesn't show wallet balance
```
→ Ensure you clicked "Connect MetaMask"
→ Check MetaMask is on Sepolia network
→ Check browser console for errors
```

### Running agents not showing
```
→ Run database migration first
→ Check Supabase agent_stats table has rows
→ Verify /api/agents/live endpoint works:
  curl http://localhost:3000/api/agents/live
```

### Agent runner fails with "Insufficient funds"
```
→ Get more Sepolia ETH from faucet
→ Check your MetaMask balance
→ Ensure contract address is set in .env
```

---

**Your agents are now live trading on Sepolia! 🎉**

The dashboard will show:
- Your real Sepolia ETH balance from MetaMask
- All running agents with live updates
- Current trading actions
- Profit/loss calculations
- All data persisted to blockchain

No real money at risk — it's all testnet ETH! 💰
