# 🚀 Live Trading on Sepolia with MetaMask

Your agents can now trade with **real ETH on Sepolia testnet** using funds from your MetaMask wallet.

---

## Architecture

```
MetaMask (Sepolia)
    ↓ (User's ETH funds)
Dashboard → API → TradingAgent.sol
    ↓
Agent Runner (Python)
    ├→ Fetches market data from /api/market/price
    ├→ Calculates signals
    └→ Calls smart contract to execute trades
    ↓
Blockchain (Sepolia)
    ├→ Records trades
    ├→ Updates agent state
    └→ Manages positions
```

---

## Prerequisites

### 1. **MetaMask Wallet with Sepolia ETH**

```
- Install MetaMask Extension
- Switch to Sepolia Testnet
- Get testnet ETH from faucet:
  - https://sepoliafaucet.com
  - https://www.alchemy.com/faucets/ethereum
```

### 2. **Deployed TradingAgent Contract**

The smart contract must be deployed on Sepolia:

```bash
# From project root
npx hardhat run scripts/deploy.js --network sepolia
```

This deploys:
- `TradingAgent.sol` - Main trading logic
- `AgentRegistry.sol` - Agent registration

**Save the contract address** - you'll need it for the agent runner.

### 3. **Sepolia RPC Endpoint**

Use one of:
- **Alchemy**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- **Infura**: `https://sepolia.infura.io/v3/YOUR_API_KEY`
- **MetaMask Provider**: Will use user's MetaMask connection

---

## Setup Steps

### Step 1: Configure Agent Runner

Update `.env` in agent-runner:

```env
# Disable paper trading
PAPER_TRADING=false

# Enable blockchain trading
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TRADING_AGENT_CONTRACT=0x1234...  # Your deployed contract address

# Market data API (Next.js server)
MARKET_DATA_API_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Step 2: Connect MetaMask in Dashboard

1. Open the dashboard at `http://localhost:3000`
2. Click wallet icon → "Connect MetaMask"
3. Approve connection
4. Dashboard now shows **your Sepolia ETH balance**

### Step 3: Fund Your Agent

Transfer ETH from MetaMask to your agent contract:

```bash
# Using ethers.js (frontend)
const tx = await contract.deposit({
  value: ethers.parseEther("0.1")  // 0.1 ETH
});
await tx.wait();
```

Or via contract deployment script:

```bash
npx hardhat run scripts/depositFunds.js --network sepolia
```

### Step 4: Start Agent Runner

```bash
cd agent-runner
python main.py
```

**What happens:**
1. Agent runner loads agents from Supabase
2. For each agent:
   - Fetches current ETH price from `/api/market/price`
   - Calculates trading signal
   - **Executes trade via smart contract** (on Sepolia)
   - Updates `agent_stats` table with results
3. Dashboard shows:
   - ✅ Your ETH balance (from MetaMask)
   - ✅ Running agents with live P&L
   - ✅ Current action (BUY/SELL/HOLD)
   - ✅ Total balance and P&L

---

## Key Differences from Paper Trading

| Feature | Paper Trading | Live Trading |
|---------|--------------|--------------|
| **Funds** | Simulated ($500) | Real Sepolia ETH |
| **Execution** | Simulated in Python | Smart contract on-chain |
| **Balance** | Virtual | From MetaMask wallet |
| **Finality** | Instant | Wait for block confirmation |
| **Risk** | None | Use testnet ETH only! ⚠️ |
| **Transactions** | None | Recording on blockchain |

---

## Dashboard Display

Your dashboard now shows:

### Wallet Overview Card
```
MetaMask Balance
Sepolia Testnet

1.25 ETH
~$4,375 USD

0x1234...5678  [Connected!]
```

### Running Agents Section
```
Agent Name          | Status   | Action | P&L
ETH Trader         | RUNNING  | HOLD   | +$123.45
BTC Sniper         | RUNNING  | BUY    | -$50.00
DCA Bot            | PAUSED   | -      | $0.00
```

Real-time updates from agent stats:
- ✅ `status` (RUNNING/PAUSED/STOPPED)
- ✅ `current_action` (BUY/SELL/HOLD)
- ✅ `pnl_usd` (Profit/Loss in USD)
- ✅ `pnl_pct` (Percentage profit/loss)
- ✅ `total_balance` (Current balance)

---

## Agent Execution Flow

```mermaid
graph LR
    A[Agent Runner] -->|Fetch Price| B[/api/market/price]
    B -->|ETH: $2,181| A
    A -->|Calculate Signal| C{Should trade?}
    C -->|Yes| D[Call Smart Contract]
    C -->|No| E[HOLD]
    D -->|executeTrade| F[Sepolia Blockchain]
    F -->|tx_hash| A
    A -->|Update Stats| G[Supabase agent_stats]
    G -->|Real-time| H[Dashboard]
    H -->|User sees| I[Live P&L + Balance]
```

---

## Live Agent Example

**Agent Configuration:**
```json
{
  "id": "8777c49b-7d53-48a1-892a-77e93384688b",
  "name": "ETH Trader",
  "strategy_type": "SPOT",
  "token_pair": "ETH/USD",
  "position_size": 0.1,
  "trigger": "PRICE_DROP_5PCT"
}
```

**Execution Flow:**

1. **Fetch Price**
   ```
   Agent gets current ETH price: $2,181
   ```

2. **Evaluate Trigger**
   ```
   Is ETH down 5%? → YES
   Should buy? → YES
   ```

3. **Execute Trade**
   ```python
   tx = await contract.executeTrade(
       direction='BUY',
       token='ETH',
       usdAmount=217.10,  # 0.1 ETH at $2,181
       currentPrice=2181
   )
   tx_hash = "0x1a2b3c..."
   ```

4. **Update Dashboard**
   ```
   agent_stats updated:
   - current_action: BUY
   - total_balance: increased
   - pnl: calculated
   
   Dashboard refreshes showing:
   ETH Trader | RUNNING | BUY | +$0.50
   ```

---

## Troubleshooting

### "Blockchain API unreachable"
```
✅ Ensure RPC URL is correct in .env
✅ Check Alchemy/Infura quota
✅ Verify BLOCKCHAIN_ENABLED=true
```

### "Insufficient funds to execute trade"
```
✅ Deposit more ETH via smart contract
✅ Check wallet balance in dashboard
✅ Account for transaction fees
```

### "Agent not updating on dashboard"
```
✅ Verify /api/agents/live endpoint works
✅ Check Supabase agent_stats table
✅ Ensure agent has current_action column
```

### "MetaMask not connecting"
```
✅ Unlock MetaMask wallet
✅ Switch to Sepolia network
✅ Refresh dashboard
✅ Check browser console for errors
```

---

## Contract Interactions

The agent runner calls these contract methods:

### `executeTrade(direction, amount, price)`
Execute a buy/sell order
```solidity
function executeTrade(
    Types.TradeDirection direction,
    uint256 amount,
    uint256 currentPrice
) external onlyExecutor;
```

### `getCurrentPosition()`
Get open position for agent
```solidity
function getCurrentPosition() 
    external view returns (Position memory);
```

### `deposit()`
Fund the agent with ETH
```solidity
function deposit() external payable;
```

### `withdraw(amount)`
Withdraw funds from agent
```solidity
function withdraw(uint256 amount) external;
```

---

## Cost Considerations

**Sepolia Testnet** (FREE test ETH):
- Gas is essentially free
- Use testnet faucets to get test ETH
- No real money at risk

**Mainnet** (when ready):
- Each trade costs gas (typical 50-200k gas)
- At current prices: ~$2-$10 per trade
- Use on Ethereum mainnet only with real funds

---

## Files Updated

- ✅ `agent-runner/config.py` - Blockchain settings
- ✅ `agent-runner/blockchain_wallet.py` - Wallet executor
- ✅ `lib/stores/useTradingStore.ts` - Uses live API
- ✅ `app/api/agents/live/route.ts` - Agent stats endpoint
- ✅ Smart contracts deployed to Sepolia

---

## Next Steps

1. **Verify Setup**
   ```bash
   # Check MetaMask connection
   npm run dev  # http://localhost:3000
   # Should show wallet balance
   ```

2. **Deploy Smart Contract**
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   # Save contract address
   ```

3. **Fund the Agent**
   ```bash
   # Send test ETH to contract address
   # Or use deposit() function
   ```

4. **Start Trading**
   ```bash
   cd agent-runner && python main.py
   # Watch dashboard for live trades!
   ```

---

**You're ready to trade with real Sepolia ETH!** 🎉

The dashboard will show:
- Your MetaMask Sepolia balance
- All running agents
- Live P&L updates
- Current trade actions

All funds are on testnet — no real money at risk! 💰
