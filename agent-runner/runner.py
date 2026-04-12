"""Agent orchestrator - manages multiple trading agents concurrently."""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List

from supabase import create_client

from config import (
    SUPABASE_URL,
    SUPABASE_KEY,
    POLL_INTERVAL,
    PAPER_TRADING,
    validate_config
)
from agent import TradingAgent
from market_data_client import MarketDataClient

logger = logging.getLogger("ice_cream_runner")


class AgentRunner:
    """Orchestrator class that manages all trading agents."""

    def __init__(self):
        self.agents: Dict[str, TradingAgent] = {}
        self.supabase = None
        self.running = False
        self._agent_tasks: Dict[str, asyncio.Task] = {}
        self._sync_task: asyncio.Task = None

    async def start(self):
        """Validate connections, load agents, and start the runner."""
        logger.info("🍦 Initializing Ice Cream Agent Runner...")

        # Log trading mode
        if PAPER_TRADING:
            logger.info("🧪 PAPER TRADING MODE — no real money at risk")
        else:
            logger.warning("⚠️ LIVE TRADING MODE — real money at risk")

        # Validate configuration
        try:
            validate_config()
            logger.info("✅ Configuration validated")
        except ValueError as e:
            logger.error(f"❌ Configuration error: {e}")
            raise

        # Initialize Supabase client
        try:
            self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("✅ Supabase client initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase: {e}")
            raise

        # Validate market data API (Next.js server on localhost:3000). 
        logger.info("🔌 Validating market data API...")
        if PAPER_TRADING:
            logger.info("🧪 Paper trading — market data API check optional")
        else:
            client = MarketDataClient("http://localhost:3000")
            client.init_session()
            probe = await client.get_price("BTC")
            if not probe.success:
                raise RuntimeError(
                    f"Market data API unreachable. "
                    "Start the Next.js server on localhost:3000.",
                )
            logger.info(f"✅ Market data API OK (BTC: ${probe.price})")

        # Load active agents from database
        await self.load_agents_from_db()

        if not self.agents:
            logger.warning("⚠️ No active agents found in database")
        else:
            logger.info(f"✅ Loaded {len(self.agents)} active agent(s)")

        self.running = True

    async def load_agents_from_db(self):
        """Load all active agents from Supabase and instantiate them."""
        try:
            result = self.supabase.table('agents').select('*').eq('is_active', True).execute()

            if result.data:
                for agent_config in result.data:
                    agent_id = str(agent_config['id'])
                    self.agents[agent_id] = TradingAgent(agent_config, self.supabase)
                    logger.debug(f"Loaded agent: {agent_config.get('name')} (ID: {agent_id})")

        except Exception as e:
            logger.error(f"Failed to load agents from database: {e}")
            raise

    async def run_agent(self, agent: TradingAgent):
        """Run a single agent in an infinite loop."""
        agent_id = str(agent.agent_id)
        agent_name = agent.name

        logger.info(f"🚀 Starting agent: {agent_name} (ID: {agent_id}, Strategy: {agent.strategy_type})")

        while self.running:
            try:
                await agent.run_cycle()
            except asyncio.CancelledError:
                logger.info(f"Agent {agent_name} (ID: {agent_id}) cancelled")
                break
            except Exception as e:
                logger.error(f"Error in agent {agent_name} (ID: {agent_id}): {e}")
                # Don't crash the runner on agent errors

            # Sleep before next cycle
            await asyncio.sleep(POLL_INTERVAL)

        logger.info(f"🛑 Agent {agent_name} (ID: {agent_id}) stopped")

    async def sync_agents(self):
        """Periodically sync agents with database changes."""
        logger.info("🔄 Starting agent sync loop (interval: 60s)")

        while self.running:
            try:
                await asyncio.sleep(60)  # Sync every 60 seconds

                if not self.running:
                    break

                logger.debug("Syncing agents with database...")

                # Get current active agents from database
                result = self.supabase.table('agents').select('*').eq('is_active', True).execute()
                db_agent_ids = set(str(a['id']) for a in result.data) if result.data else set()
                local_agent_ids = set(self.agents.keys())

                # Find new agents to add
                new_ids = db_agent_ids - local_agent_ids
                for agent_id in new_ids:
                    agent_config = next((a for a in result.data if str(a['id']) == agent_id), None)
                    if agent_config:
                        self.agents[agent_id] = TradingAgent(agent_config, self.supabase)
                        # Start the new agent
                        task = asyncio.create_task(self.run_agent(self.agents[agent_id]))
                        self._agent_tasks[agent_id] = task
                        logger.info(f"➕ Added new agent: {agent_config.get('name')} (ID: {agent_id})")

                # Find deactivated agents to remove
                removed_ids = local_agent_ids - db_agent_ids
                for agent_id in removed_ids:
                    if agent_id in self._agent_tasks:
                        self._agent_tasks[agent_id].cancel()
                        try:
                            await self._agent_tasks[agent_id]
                        except asyncio.CancelledError:
                            pass
                        del self._agent_tasks[agent_id]

                    agent_name = self.agents[agent_id].name
                    del self.agents[agent_id]
                    logger.info(f"➖ Removed deactivated agent: {agent_name} (ID: {agent_id})")

                # Update existing agent configs
                for agent_id in db_agent_ids & local_agent_ids:
                    agent_config = next((a for a in result.data if str(a['id']) == agent_id), None)
                    if agent_config:
                        # Update relevant fields
                        agent = self.agents[agent_id]
                        agent.trigger_condition = agent_config.get('trigger', agent.trigger_condition)
                        agent.position_size = float(agent_config.get('position_size', agent.position_size))
                        agent.stop_loss_pct = float(agent_config.get('stop_loss_pct', agent.stop_loss_pct))
                        agent.is_active = agent_config.get('is_active', agent.is_active)

                logger.debug(f"Agent sync complete: {len(self.agents)} active agents")

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in agent sync: {e}")

    async def run_all(self):
        """Start all agent tasks concurrently plus the sync loop."""
        if not self.agents:
            logger.warning("No agents to run")
            return

        # Create tasks for all agents
        for agent_id, agent in self.agents.items():
            task = asyncio.create_task(self.run_agent(agent), name=f"agent-{agent_id}")
            self._agent_tasks[agent_id] = task

        # Create sync task
        self._sync_task = asyncio.create_task(self.sync_agents(), name="agent-sync")

        # Run all tasks concurrently
        all_tasks = list(self._agent_tasks.values()) + [self._sync_task]

        logger.info(f"🎯 Running {len(self._agent_tasks)} agent(s) + sync loop")

        try:
            await asyncio.gather(*all_tasks, return_exceptions=True)
        except asyncio.CancelledError:
            logger.info("All tasks cancelled")
        except Exception as e:
            logger.error(f"Error in run_all: {e}")

    async def stop(self):
        """Gracefully shut down all agent tasks."""
        logger.info("🛑 Stopping Agent Runner...")
        self.running = False

        # Cancel all agent tasks
        for agent_id, task in self._agent_tasks.items():
            task.cancel()
            logger.debug(f"Cancelled agent task: {agent_id}")

        # Cancel sync task
        if self._sync_task:
            self._sync_task.cancel()
            logger.debug("Cancelled sync task")

        # Wait for all tasks to complete
        all_tasks = list(self._agent_tasks.values())
        if self._sync_task:
            all_tasks.append(self._sync_task)

        for task in all_tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Error stopping task: {e}")

        logger.info("✅ Agent Runner stopped")

    def get_status(self) -> Dict[str, Any]:
        """Get current status of all agents."""
        return {
            'running': self.running,
            'paper_trading': PAPER_TRADING,
            'poll_interval': POLL_INTERVAL,
            'agent_count': len(self.agents),
            'agents': {
                agent_id: agent.get_status()
                for agent_id, agent in self.agents.items()
            },
            'timestamp': datetime.utcnow().isoformat()
        }
