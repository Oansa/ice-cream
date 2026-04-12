# Blockchain Deployment Guide

Deploy your AI trading agents to Sepolia testnet as NFTs!

## Overview

This platform now supports deploying trading agents to the **Sepolia Ethereum testnet**. Each agent is minted as an ERC721 NFT, giving users:

- **True ownership** of their agents via wallet connection
- **On-chain transparency** for all trades and configurations
- **Transferability** - agents can be sold/traded as NFTs
- **Decentralized execution** - trades recorded immutably

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js)                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐│
│  │ Agent Builder   │    │ Web3 Connect    │    │ On-Chain Agents ││
│  │                 │    │                 │    │                 ││
│  │ - Form UI       │───▶│ - MetaMask      │───▶│ - NFT Gallery   ││
│  │ - Strategy Graph│    │ - Sepolia       │    │ - Controls      ││
│  └─────────────────┘    └─────────────────┘    └─────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Sepolia Testnet (Ethereum L1)                   │
│                                                                     │
│   ┌──────────────┐              ┌──────────────┐                   │
│   │ AgentRegistry│              │ TradingAgent │                   │
│   │              │  deploys     │              │                   │
│   │ - ERC721 NFT │─────────────▶│ - Config     │                   │
│   │ - Factory    │              │ - Trade log  │                   │
│   │ - Metadata   │              │ - Execution  │                   │
│   └──────────────┘              └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Agent Runner (Python)                          │
│                                                                     │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐      │
│  │ Blockchain     │    │ Trading        │    │ Kraken API     │      │
│  │ Listener       │───▶│ Execution      │───▶│ (Live trading) │      │
│  │                │    │                │    │                │      │
│  │ - Event polls  │    │ - Spot         │    │                │      │
│  │ - Signal trade │    │ - DCA          │    │                │      │
│  └────────────────┘    └────────────────┘    └────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
# Frontend dependencies (already included)
npm install

# Agent-runner dependencies
pip install -r agent-runner/requirements.txt
```

### 2. Configure Environment

Create `.env.local` with:

```bash
# Sepolia RPC (public node or Alchemy/Infura)
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
# Or use Alchemy: https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# For contract deployment (needs Sepolia ETH)
PRIVATE_KEY=your_private_key_here

# For agent-runner blockchain features
AGENT_WALLET_PRIVATE_KEY=your_agent_wallet_key
AGENT_REGISTRY_ADDRESS=0x... # After deployment

# Frontend
NEXT_PUBLIC_AGENT_REGISTRY=0x... # After deployment
```

### 3. Deploy Contracts to Sepolia

```bash
# Install Hardhat dependencies
npm install

# Deploy AgentRegistry
npx hardhat run scripts/deploy.js --network sepolia

# This will:
# - Deploy AgentRegistry contract
# - Save deployment to deployments/sepolia.json
# - Update .env.local with contract address
```

### 4. Deploy an Agent via Script

```bash
# Deploy a test agent
npx hardhat run scripts/deploy-agent.js --network sepolia \
  --name "My First Agent" \
  --strategy SPOT \
  --pair ETH/USD \
  --trigger PRICE_DROP_5PCT \
  --size 0.1 \
  --stoploss 5
```

### 5. Run the Agent with Blockchain Listener

```bash
cd agent-runner

# Set environment variables
export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
export AGENT_REGISTRY_ADDRESS=0x... # Your deployed address
export AGENT_WALLET_PRIVATE_KEY=0x... # For executing trades on-chain

# Start the runner
python main.py
```

## Smart Contract Details

### AgentRegistry (ERC721)

**Key Features:**
- Mint agents as NFTs
- Store agent metadata on-chain
- Track user agents
- Configurable deployment fee

**Functions:**
```solidity
function deployAgent(
    string name,
    StrategyType strategyType,
    string tokenPair,
    string trigger,
    uint256 positionSize,
    uint256 stopLossPct,
    string strategyGraphJSON
) payable returns (uint256 tokenId, address agentContract)

function toggleAgentStatus(uint256 tokenId)
function getUserAgents(address user) returns (uint256[])
function getAgentInfo(uint256 tokenId) returns (AgentMetadata)
```

### TradingAgent

**Key Features:**
- Individual agent configuration
- Trade execution logging
- Stop-loss checking
- Position tracking

**Events:**
```solidity
event TradeExecuted(
    uint256 indexed tradeId,
    TradeDirection direction,
    uint256 amount,
    uint256 price,
    uint256 timestamp,
    string txHash
);
```

## Frontend Integration

### Connect Wallet

```tsx
import { useWeb3 } from "@/hooks/useWeb3";

function MyComponent() {
  const { connect, isConnected, address } = useWeb3();

  return (
    <button onClick={connect}>
      {isConnected ? `Connected: ${address}` : "Connect Wallet"}
    </button>
  );
}
```

### Deploy Agent from UI

```tsx
import { useAgentRegistry } from "@/hooks/useWeb3";

function DeployButton() {
  const { deployAgent, isLoading } = useAgentRegistry();

  const handleDeploy = async () => {
    const result = await deployAgent({
      name: "My Agent",
      strategyType: StrategyType.SPOT,
      tokenPair: "ETH/USD",
      trigger: "PRICE_DROP_5PCT",
      positionSize: "0.1", // ETH
      stopLossPct: 5,
    });

    console.log("Deployed! Token ID:", result.tokenId);
  };

  return (
    <button onClick={handleDeploy} disabled={isLoading}>
      {isLoading ? "Deploying..." : "Deploy to Sepolia"}
    </button>
  );
}
```

## Python Blockchain Integration

### Listen for Events

```python
from blockchain_listener import BlockchainListener

async def main():
    listener = BlockchainListener(
        registry_address="0x...",
        rpc_url="https://ethereum-sepolia-rpc.publicnode.com",
    )

    # Set up event handlers
    async def on_agent_deployed(agent_config):
        print(f"New agent: {agent_config.name}")
        # Start trading with this config

    async def on_trade_executed(trade):
        print(f"Trade: {trade.direction} {trade.amount}")

    listener.on_agent_deployed = on_agent_deployed
    listener.on_trade_executed = on_trade_executed

    await listener.start()
```

### Execute Trades On-Chain

```python
from blockchain_listener import BlockchainExecutor

executor = BlockchainExecutor(
    private_key="0x...",
    rpc_url="https://ethereum-sepolia-rpc.publicnode.com",
)

# Log trade on-chain
tx_hash = await executor.execute_trade(
    agent_contract_address="0x...",
    direction="BUY",
    amount=0.1,
    price=3500.00,
    tx_hash="kraken_order_123",
)
```

## Testing

### Get Sepolia ETH

1. Visit [Sepolia Faucet](https://sepoliafaucet.com)
2. Request 0.5 SepoliaETH (need Alchemy account)
3. Or use [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

### Verify Contracts

```bash
# Verify on Sepolia Etherscan
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

### Check Deployment

```bash
# Query contract state
npx hardhat console --network sepolia

> const registry = await ethers.getContractAt("AgentRegistry", "0x...")
> await registry.deploymentFee()
> await registry.totalSupply()
```

## Gas Costs (Sepolia)

| Operation | Gas Used | Cost (ETH) |
|-----------|----------|------------|
| Deploy Registry | ~2,500,000 | ~0.0001 |
| Deploy Agent | ~800,000 | ~0.00005 |
| Execute Trade | ~50,000 | ~0.000003 |
| Toggle Status | ~30,000 | ~0.000002 |

## Security Considerations

1. **Private Keys**: Never commit private keys to git
2. **Testnet Only**: Sepolia is for testing - no real value
3. **Executor Wallet**: Use a dedicated wallet for the agent runner
4. **Rate Limiting**: RPCs have rate limits - use Alchemy/Infura for production

## Troubleshooting

### Connection Issues

```bash
# Test RPC connection
curl -X POST https://ethereum-sepolia-rpc.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

### Transaction Failures

- Ensure wallet has SepoliaETH
- Check gas settings (maxFeePerGas)
- Verify contract address is correct

### Event Not Found

- Check RPC supports event logs
- Increase poll interval
- Verify fromBlock is recent

## Next Steps

1. **Mainnet Deployment**: After Sepolia testing, deploy to Ethereum mainnet
2. **Layer 2**: Consider Arbitrum/Optimism for lower gas costs
3. **IPFS**: Store strategy graphs on IPFS
4. **Price Oracles**: Integrate Chainlink for on-chain price verification
