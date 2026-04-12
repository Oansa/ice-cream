/**
 * Blockchain listener for on-chain agent events
 * Listens to Sepolia for agent deployments and trade signals
 */

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from decimal import Decimal

from web3 import Web3
from web3.contract import Contract
from web3.datastructures import AttributeDict
from web3.exceptions import TransactionNotFound
from eth_abi import decode

logger = logging.getLogger("ice_cream_runner")

# Contract ABIs (minimal versions for efficiency)
AGENT_REGISTRY_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "tokenId", "type": "uint256"},
            {"indexed": True, "name": "owner", "type": "address"},
            {"indexed": False, "name": "agentContract", "type": "address"},
            {"indexed": False, "name": "name", "type": "string"},
            {"indexed": False, "name": "strategyType", "type": "uint8"},
            {"indexed": False, "name": "timestamp", "type": "uint256"},
        ],
        "name": "AgentDeployed",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "tokenId", "type": "uint256"},
            {"indexed": False, "name": "isActive", "type": "bool"},
        ],
        "name": "AgentStatusChanged",
        "type": "event",
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "getAgentInfo",
        "outputs": [
            {"name": "name", "type": "string"},
            {"name": "strategyType", "type": "uint8"},
            {"name": "tokenPair", "type": "string"},
            {"name": "trigger", "type": "string"},
            {"name": "positionSize", "type": "uint256"},
            {"name": "stopLossPct", "type": "uint256"},
            {"name": "isActive", "type": "bool"},
            {"name": "createdAt", "type": "uint256"},
            {"name": "agentContract", "type": "address"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "user", "type": "address"}],
        "name": "getUserAgents",
        "outputs": [{"name": "tokenIds", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function",
    },
]

TRADING_AGENT_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "tradeId", "type": "uint256"},
            {"indexed": False, "name": "direction", "type": "uint8"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "price", "type": "uint256"},
            {"indexed": False, "name": "timestamp", "type": "uint256"},
            {"indexed": False, "name": "txHash", "type": "string"},
        ],
        "name": "TradeExecuted",
        "type": "event",
    },
    {
        "inputs": [],
        "name": "isActive",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "tokenPair",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "strategyType",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "direction", "type": "uint8"},
            {"name": "amount", "type": "uint256"},
            {"name": "price", "type": "uint256"},
            {"name": "txHash", "type": "string"},
        ],
        "name": "executeTrade",
        "outputs": [{"name": "tradeId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


@dataclass
class AgentConfig:
    """Represents an on-chain agent configuration"""
    token_id: int
    name: str
    strategy_type: int
    token_pair: str
    trigger: str
    position_size: Decimal
    stop_loss_pct: Decimal
    is_active: bool
    created_at: datetime
    agent_contract: str
    owner: str


@dataclass
class TradeEvent:
    """Represents a trade execution event"""
    trade_id: int
    agent_contract: str
    direction: str  # BUY, SELL, HOLD
    amount: Decimal
    price: Decimal
    timestamp: datetime
    tx_hash: str


class BlockchainListener:
    """
    Listens to Sepolia blockchain for agent events
    and coordinates off-chain execution
    """

    STRATEGY_TYPES = {
        0: "SPOT",
        1: "DCA",
        2: "SNIPER",
        3: "MARGIN",
        4: "MEME",
        5: "ARBITRAGE",
        6: "VISUAL",
    }

    TRADE_DIRECTIONS = {
        0: "BUY",
        1: "SELL",
        2: "HOLD",
    }

    def __init__(
        self,
        registry_address: Optional[str] = None,
        rpc_url: Optional[str] = None,
        poll_interval: int = 15,
    ):
        self.registry_address = registry_address or os.getenv(
            "AGENT_REGISTRY_ADDRESS", ""
        )
        self.rpc_url = rpc_url or os.getenv(
            "SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com"
        )
        self.poll_interval = poll_interval

        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to Sepolia RPC: {self.rpc_url}")

        logger.info(f"Connected to Sepolia (chainId: {self.w3.eth.chain_id})")

        # Initialize contracts
        self.registry: Optional[Contract] = None
        self.agent_contracts: Dict[str, Contract] = {}

        if self.registry_address:
            self._init_registry()

        # Event handlers
        self.on_agent_deployed: Optional[Callable[[AgentConfig], Any]] = None
        self.on_agent_status_changed: Optional[Callable[[int, bool], Any]] = None
        self.on_trade_executed: Optional[Callable[[TradeEvent], Any]] = None

        # Tracking
        self.last_block = 0
        self.active_agents: Dict[int, AgentConfig] = {}
        self._running = False

    def _init_registry(self):
        """Initialize the registry contract"""
        if not self.registry_address:
            logger.warning("No registry address provided")
            return

        checksum_address = Web3.to_checksum_address(self.registry_address)
        self.registry = self.w3.eth.contract(
            address=checksum_address,
            abi=AGENT_REGISTRY_ABI,
        )
        logger.info(f"Registry contract initialized at {checksum_address}")

    def _get_agent_contract(self, contract_address: str) -> Contract:
        """Get or create agent contract instance"""
        if contract_address not in self.agent_contracts:
            checksum_address = Web3.to_checksum_address(contract_address)
            self.agent_contracts[contract_address] = self.w3.eth.contract(
                address=checksum_address,
                abi=TRADING_AGENT_ABI,
            )
        return self.agent_contracts[contract_address]

    async def get_agent_info(self, token_id: int) -> Optional[AgentConfig]:
        """Fetch agent info from the registry"""
        if not self.registry:
            return None

        try:
            info = await asyncio.to_thread(
                self.registry.functions.getAgentInfo(token_id).call
            )

            return AgentConfig(
                token_id=token_id,
                name=info[0],
                strategy_type=info[1],
                token_pair=info[2],
                trigger=info[3],
                position_size=Decimal(info[4]) / Decimal(10**18),  # Convert from wei
                stop_loss_pct=Decimal(info[5]) / Decimal(100),  # Convert from basis points
                is_active=info[6],
                created_at=datetime.fromtimestamp(info[7]),
                agent_contract=info[8],
                owner="",  # Would need separate call
            )
        except Exception as e:
            logger.error(f"Error fetching agent info for token {token_id}: {e}")
            return None

    async def get_user_agents(self, user_address: str) -> List[AgentConfig]:
        """Get all agents for a user"""
        if not self.registry:
            return []

        try:
            token_ids = await asyncio.to_thread(
                self.registry.functions.getUserAgents(
                    Web3.to_checksum_address(user_address)
                ).call
            )

            agents = []
            for token_id in token_ids:
                agent = await self.get_agent_info(token_id)
                if agent:
                    agent.owner = user_address
                    agents.append(agent)

            return agents
        except Exception as e:
            logger.error(f"Error fetching user agents for {user_address}: {e}")
            return []

    def _decode_agent_deployed_event(self, event: AttributeDict) -> Optional[AgentConfig]:
        """Decode AgentDeployed event"""
        try:
            return AgentConfig(
                token_id=event.args.tokenId,
                name=event.args.name,
                strategy_type=event.args.strategyType,
                token_pair="",  # Not in event, need to fetch
                trigger="",
                position_size=Decimal(0),
                stop_loss_pct=Decimal(0),
                is_active=True,
                created_at=datetime.fromtimestamp(event.args.timestamp),
                agent_contract=event.args.agentContract,
                owner=event.args.owner,
            )
        except Exception as e:
            logger.error(f"Error decoding AgentDeployed event: {e}")
            return None

    def _decode_trade_executed_event(
        self, event: AttributeDict, agent_contract: str
    ) -> Optional[TradeEvent]:
        """Decode TradeExecuted event"""
        try:
            direction = self.TRADE_DIRECTIONS.get(event.args.direction, "UNKNOWN")
            return TradeEvent(
                trade_id=event.args.tradeId,
                agent_contract=agent_contract,
                direction=direction,
                amount=Decimal(event.args.amount) / Decimal(10**18),
                price=Decimal(event.args.price) / Decimal(10**18),
                timestamp=datetime.fromtimestamp(event.args.timestamp),
                tx_hash=event.args.txHash,
            )
        except Exception as e:
            logger.error(f"Error decoding TradeExecuted event: {e}")
            return None

    async def poll_events(self):
        """Poll for new events"""
        if not self.registry:
            logger.warning("Registry not initialized, skipping poll")
            return

        current_block = await asyncio.to_thread(lambda: self.w3.eth.block_number)

        if self.last_block == 0:
            self.last_block = current_block - 100  # Start from 100 blocks ago

        if current_block <= self.last_block:
            return

        logger.debug(f"Polling blocks {self.last_block + 1} to {current_block}")

        # Query AgentDeployed events
        try:
            agent_events = await asyncio.to_thread(
                lambda: self.registry.events.AgentDeployed().get_logs(
                    fromBlock=self.last_block + 1,
                    toBlock=current_block,
                )
            )

            for event in agent_events:
                config = self._decode_agent_deployed_event(event)
                if config:
                    logger.info(
                        f"New agent deployed: #{config.token_id} - {config.name} "
                        f"at {config.agent_contract}"
                    )

                    # Fetch full info
                    full_info = await self.get_agent_info(config.token_id)
                    if full_info:
                        full_info.owner = config.owner
                        self.active_agents[config.token_id] = full_info

                        if self.on_agent_deployed:
                            await self.on_agent_deployed(full_info)

        except Exception as e:
            logger.error(f"Error polling AgentDeployed events: {e}")

        # Query AgentStatusChanged events
        try:
            status_events = await asyncio.to_thread(
                lambda: self.registry.events.AgentStatusChanged().get_logs(
                    fromBlock=self.last_block + 1,
                    toBlock=current_block,
                )
            )

            for event in status_events:
                token_id = event.args.tokenId
                is_active = event.args.isActive

                logger.info(f"Agent #{token_id} status changed: active={is_active}")

                if token_id in self.active_agents:
                    self.active_agents[token_id].is_active = is_active

                if self.on_agent_status_changed:
                    await self.on_agent_status_changed(token_id, is_active)

        except Exception as e:
            logger.error(f"Error polling AgentStatusChanged events: {e}")

        # Poll TradeExecuted events for active agents
        for token_id, agent in list(self.active_agents.items()):
            if not agent.is_active:
                continue

            try:
                agent_contract = self._get_agent_contract(agent.agent_contract)
                trade_events = await asyncio.to_thread(
                    lambda: agent_contract.events.TradeExecuted().get_logs(
                        fromBlock=self.last_block + 1,
                        toBlock=current_block,
                    )
                )

                for event in trade_events:
                    trade = self._decode_trade_executed_event(
                        event, agent.agent_contract
                    )
                    if trade:
                        logger.info(
                            f"Trade executed on agent #{token_id}: "
                            f"{trade.direction} {trade.amount} @ {trade.price}"
                        )

                        if self.on_trade_executed:
                            await self.on_trade_executed(trade)

            except Exception as e:
                logger.error(
                    f"Error polling TradeExecuted events for agent {token_id}: {e}"
                )

        self.last_block = current_block

    async def start(self):
        """Start the blockchain listener"""
        if self._running:
            return

        self._running = True
        logger.info("Blockchain listener started")

        while self._running:
            try:
                await self.poll_events()
            except Exception as e:
                logger.error(f"Error in poll loop: {e}")

            await asyncio.sleep(self.poll_interval)

    async def stop(self):
        """Stop the blockchain listener"""
        self._running = False
        logger.info("Blockchain listener stopped")

    def get_active_agents(self) -> Dict[int, AgentConfig]:
        """Get currently active agents"""
        return {
            k: v for k, v in self.active_agents.items() if v.is_active
        }


class BlockchainExecutor:
    """
    Executes trades on-chain by submitting transactions
    Requires a funded wallet with private key
    """

    def __init__(
        self,
        private_key: Optional[str] = None,
        rpc_url: Optional[str] = None,
    ):
        self.private_key = private_key or os.getenv("AGENT_WALLET_PRIVATE_KEY")
        self.rpc_url = rpc_url or os.getenv(
            "SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com"
        )

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to Sepolia RPC: {self.rpc_url}")

        if self.private_key:
            self.account = self.w3.eth.account.from_key(self.private_key)
            self.address = self.account.address
            logger.info(f"Blockchain executor initialized with address {self.address}")
        else:
            self.account = None
            self.address = None
            logger.warning("No private key provided, read-only mode")

    async def execute_trade(
        self,
        agent_contract_address: str,
        direction: str,  # BUY, SELL, HOLD
        amount: Decimal,
        price: Decimal,
        tx_hash: str = "",
    ) -> Optional[str]:
        """
        Execute a trade on-chain
        Returns transaction hash or None if failed
        """
        if not self.account:
            logger.error("Cannot execute trade: no private key configured")
            return None

        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(agent_contract_address),
                abi=TRADING_AGENT_ABI,
            )

            # Map direction to enum
            direction_map = {"BUY": 0, "SELL": 1, "HOLD": 2}
            direction_enum = direction_map.get(direction.upper(), 2)

            # Convert amounts to wei
            amount_wei = int(amount * Decimal(10**18))
            price_wei = int(price * Decimal(10**18))

            # Build transaction
            tx = await asyncio.to_thread(
                lambda: contract.functions.executeTrade(
                    direction_enum,
                    amount_wei,
                    price_wei,
                    tx_hash,
                ).build_transaction({
                    "from": self.address,
                    "nonce": self.w3.eth.get_transaction_count(self.address),
                    "gas": 200000,
                    "maxFeePerGas": self.w3.to_wei("50", "gwei"),
                    "maxPriorityFeePerGas": self.w3.to_wei("2", "gwei"),
                    "chainId": 11155111,  # Sepolia
                })
            )

            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = await asyncio.to_thread(
                lambda: self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            )

            receipt = await asyncio.to_thread(
                lambda: self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            )

            if receipt.status == 1:
                tx_hash_hex = tx_hash.hex()
                logger.info(f"Trade executed successfully: {tx_hash_hex}")
                return tx_hash_hex
            else:
                logger.error(f"Trade transaction failed: {tx_hash.hex()}")
                return None

        except Exception as e:
            logger.error(f"Error executing trade: {e}")
            return None

    async def check_balance(self) -> Decimal:
        """Check wallet balance"""
        if not self.address:
            return Decimal(0)

        balance_wei = await asyncio.to_thread(
            lambda: self.w3.eth.get_balance(self.address)
        )
        return Decimal(balance_wei) / Decimal(10**18)
