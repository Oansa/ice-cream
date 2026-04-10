"""Individual trading agent logic."""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from config import PAPER_TRADING, POLL_INTERVAL, USE_REALTIME_FEED, REALTIME_FEED_URL
from kraken import KrakenCLI, KrakenCLIError
from logger import get_agent_logger
from market_feed import RealTimeMarketFeed
from strategies.spot import SpotStrategy
from strategies.dca import DCAStrategy
from strategies.sniper import SniperStrategy
from blocks import StrategyGraph, BlockExecutor

logger = logging.getLogger("ice_cream_runner")


class TradingAgent:
    """Represents a single configured trading agent."""

    def __init__(self, config: Dict[str, Any], kraken: KrakenCLI, supabase):
        self.agent_id = config["id"]
        self.name = config["name"]
        self.strategy_type = config["strategy_type"]  # SPOT, DCA, SNIPER, MARGIN, MEME, ARBITRAGE, VISUAL
        self.token_pair = config["token_pair"]  # e.g., ETH/USD
        self.trigger_condition = config["trigger"]  # e.g., PRICE_DROP_5PCT
        self.position_size = float(config["position_size"])  # USD amount
        self.stop_loss_pct = float(config.get("stop_loss_pct", 5.0))  # percentage
        self.is_active = config["is_active"]
        self.user_id = config.get("user_id")
        self.strategy_graph_json = config.get("strategy_graph")

        self.kraken = kraken
        self.supabase = supabase

        # Trading state
        self.last_trade_at = None
        self.total_pnl = 0.0
        self.trade_count = 0
        self.position = None  # Current open position
        self.entry_price = 0.0

        # Strategy instances
        self.spot_strategy = SpotStrategy()
        self.dca_strategy = DCAStrategy()
        self.sniper_strategy = SniperStrategy()

        # Optional realtime feed for better latency
        self.realtime_feed = None
        if USE_REALTIME_FEED:
            self.realtime_feed = RealTimeMarketFeed(self.token_pair, ws_url=REALTIME_FEED_URL)

        # Get agent-specific logger
        self.agent_logger = get_agent_logger(logger, str(self.agent_id), self.strategy_type)
        self.block_executor = None

        if self.strategy_graph_json:
            try:
                graph = StrategyGraph.from_json(self.strategy_graph_json)
                self.block_executor = BlockExecutor(graph)
            except Exception as e:
                self.agent_logger.error(f"Failed to initialize visual strategy graph: {e}")

    async def run_cycle(self):
        """Main loop for one agent cycle."""
        try:
            self.agent_logger.info(f"Starting cycle for {self.token_pair}")

            # Get current market data, using websocket feed if enabled
            ticker_data = await self._get_ticker_data()
            current_price = self._extract_price(ticker_data)

            if current_price <= 0:
                self.agent_logger.warning(f"Could not get valid price for {self.token_pair}")
                await self.update_agent_status("ERROR")
                return

            self.agent_logger.debug(f"Current price for {self.token_pair}: {current_price}")

            # Get price history for strategy evaluation
            price_history = self._get_price_history()

            if self.block_executor:
                market_data = self._build_graph_market_data(ticker_data, current_price, price_history)
                result = await self.block_executor.execute_cycle(market_data)

                if result.events:
                    self.agent_logger.debug(f"Graph events: {result.events}")

                if result.orders:
                    await self._process_graph_orders(result.orders, current_price)

                await self.update_agent_status("ACTIVE")
                return

            # Check stop loss if we have a position
            if self.position:
                await self.check_stop_loss(current_price)
                return

            # Evaluate trigger condition
            should_trade = await self.evaluate_trigger(current_price, price_history)

            if should_trade:
                self.agent_logger.info(f"Trigger condition met for {self.token_pair}")
                await self.execute_trade("buy", current_price)
            else:
                self.agent_logger.debug(f"No trade signal for {self.token_pair}")

            # Update agent status
            await self.update_agent_status("ACTIVE")

        except KrakenCLIError as e:
            self.agent_logger.error(f"Kraken CLI error: {e.message}")
            await self.update_agent_status("ERROR")
        except Exception as e:
            self.agent_logger.error(f"Unexpected error in run_cycle: {e}")
            await self.update_agent_status("ERROR")

    def _extract_price(self, ticker_data: Dict[str, Any]) -> float:
        """Extract current price from ticker data."""
        # Try different possible structures
        if isinstance(ticker_data, dict):
            # Try direct price fields
            for key in ['last', 'c', 'price', 'ask']:
                if key in ticker_data:
                    price = ticker_data[key]
                    if isinstance(price, (int, float)):
                        return float(price)
                    elif isinstance(price, (list, tuple)):
                        return float(price[0])

            # Try nested structure like {pair: {last: X}}
            for pair_key, pair_data in ticker_data.items():
                if isinstance(pair_data, dict):
                    for key in ['last', 'c', 'price']:
                        if key in pair_data:
                            val = pair_data[key]
                            return float(val[0]) if isinstance(val, (list, tuple)) else float(val)

        return 0.0

    def _get_price_history(self) -> list:
        """Get OHLC price history for strategy analysis."""
        try:
            ohlc_data = self.kraken.get_ohlc(self.token_pair, interval=60)  # 1-hour candles
            return ohlc_data if ohlc_data else []
        except KrakenCLIError:
            return []

    def _build_graph_market_data(
        self,
        ticker_data: Dict[str, Any],
        current_price: float,
        price_history: list,
    ) -> Dict[str, Any]:
        """Build market data payload for graph execution."""
        volume = 0
        if isinstance(ticker_data, dict):
            vol = ticker_data.get('volume')
            if isinstance(vol, list) and len(vol) > 1:
                volume = vol[1]
            elif isinstance(vol, (int, float)):
                volume = vol

        return {
            'last': current_price,
            'ohlc': price_history,
            'volume': volume,
            'ticker': ticker_data,
        }

    async def _process_graph_orders(self, orders: list, current_price: float):
        """Execute real orders emitted by the visual strategy graph."""
        for envelope in orders:
            order = envelope.get('order', {}) if isinstance(envelope, dict) else {}
            direction = order.get('direction')
            amount = order.get('amount')

            if direction not in ('buy', 'sell'):
                continue

            self.agent_logger.info(
                f"Graph order generated: {direction} amount={amount} block={envelope.get('block_id')}",
            )

            await self.execute_trade(direction, current_price, amount_override=amount)

    async def _get_ticker_data(self) -> Dict[str, Any]:
        """Fetch ticker data using websocket feed if available, otherwise fallback to Kraken CLI."""
        if self.realtime_feed is not None:
            try:
                ticker = await self.realtime_feed.get_latest_ticker()
                if ticker and ticker.get('last'):
                    return ticker
                self.agent_logger.debug("Realtime feed returned no valid ticker, falling back to Kraken CLI")
            except Exception as exc:
                self.agent_logger.warning(f"Realtime feed failed: {exc}")

        return self.kraken.get_ticker(self.token_pair)

    async def evaluate_trigger(self, current_price: float, price_history: list) -> bool:
        """Evaluate if trigger condition is met based on strategy type."""
        if self.strategy_type == "SPOT":
            return self.spot_strategy.should_buy(
                current_price,
                price_history,
                self.trigger_condition
            )

        elif self.strategy_type == "DCA":
            # Parse interval from trigger condition (e.g., "INTERVAL_24H")
            interval_hours = 24
            if self.trigger_condition and "H" in self.trigger_condition.upper():
                try:
                    interval_str = self.trigger_condition.upper().replace("INTERVAL_", "").replace("H", "")
                    interval_hours = int(interval_str)
                except (ValueError, AttributeError):
                    interval_hours = 24

            return self.dca_strategy.should_buy(self.last_trade_at, interval_hours)

        elif self.strategy_type == "SNIPER":
            try:
                orderbook = self.kraken.get_orderbook(self.token_pair)
                return self.sniper_strategy.should_buy(self.token_pair, orderbook)
            except KrakenCLIError:
                return False

        elif self.strategy_type == "MARGIN":
            # Margin trading - similar to spot but with leverage
            return self.spot_strategy.should_buy(
                current_price,
                price_history,
                self.trigger_condition
            )

        elif self.strategy_type == "MEME":
            # Meme strategy - high volatility trades
            return self.spot_strategy.should_buy(
                current_price,
                price_history,
                self.trigger_condition
            )

        elif self.strategy_type == "ARBITRAGE":
            # Arbitrage would require multiple exchange data
            self.agent_logger.debug("Arbitrage strategy not yet implemented")
            return False

        else:
            self.agent_logger.warning(f"Unknown strategy type: {self.strategy_type}")
            return False

    async def execute_trade(self, direction: str, price: float, amount_override: Optional[float] = None):
        """Place the order via KrakenCLI and record outcome."""
        try:
            # Calculate position size
            if self.strategy_type == "SPOT":
                balance = self.kraken.get_balance()
                volume = self.spot_strategy.calculate_position_size(balance, self.position_size, price)
            elif self.strategy_type == "DCA":
                balance = self.kraken.get_balance()
                dca_amount = self.dca_strategy.calculate_dca_amount(self.position_size)
                volume = dca_amount / price if price > 0 else 0
            elif self.strategy_type == "SNIPER":
                volume = self.sniper_strategy.calculate_snipe_size(self.position_size, price)
            elif self.strategy_type == "VISUAL":
                volume = amount_override if amount_override is not None else self.position_size / price if price > 0 else 0
            else:
                # Default calculation
                volume = amount_override if amount_override is not None else self.position_size / price if price > 0 else 0

            if volume <= 0:
                self.agent_logger.warning(f"Calculated volume is {volume}, skipping trade")
                return

            volume_str = f"{volume:.6f}"

            self.agent_logger.info(
                f"{self.token_pair} | Placing {direction.upper()} order | Volume: {volume_str} | Paper: {PAPER_TRADING}"
            )

            # Place the order
            order_result = self.kraken.place_order(
                pair=self.token_pair,
                direction=direction,
                volume=volume_str,
                order_type="market",
                paper=PAPER_TRADING
            )

            # Extract order ID from result
            order_id = order_result.get('order_id') or order_result.get('txid', ['N/A'])[0]

            self.agent_logger.info(f"Order placed successfully | Order ID: {order_id}")

            # Record trade to database
            trade_data = {
                'agent_id': self.agent_id,
                'pair': self.token_pair,
                'direction': direction.upper(),
                'amount': volume,
                'entry_price': price if direction == 'buy' else None,
                'exit_price': None if direction == 'buy' else price,
                'pnl': None,
                'status': 'OPEN' if direction == 'buy' else 'CLOSED',
                'kraken_order_id': order_id,
                'created_at': datetime.utcnow().isoformat()
            }

            await self.save_trade_to_db(trade_data)

            # Update tracking
            if direction == 'buy':
                self.position = {
                    'amount': volume,
                    'entry_price': price,
                    'order_id': order_id
                }
                self.entry_price = price

            self.last_trade_at = datetime.utcnow()
            self.trade_count += 1

            # Update agent stats
            await self.update_agent_stats()

        except KrakenCLIError as e:
            self.agent_logger.error(f"Trade execution failed: {e.message}")
            raise

    async def check_stop_loss(self, current_price: float):
        """Check if stop loss threshold is breached and close position if so."""
        if not self.position:
            return

        should_exit = self.spot_strategy.should_sell(
            current_price,
            self.entry_price,
            self.stop_loss_pct,
            take_profit_pct=None  # Could be configurable
        )

        if should_exit:
            pnl_pct = (current_price - self.entry_price) / self.entry_price * 100
            self.agent_logger.info(
                f"Stop loss triggered | Entry: {self.entry_price} | Current: {current_price} | PnL: {pnl_pct:.2f}%"
            )

            await self.execute_trade("sell", current_price)

            # Calculate PnL
            trade_result = {
                'entry_price': self.entry_price,
                'exit_price': current_price,
                'amount': self.position['amount']
            }
            await self.update_pnl(trade_result)

            # Clear position
            self.position = None
            self.entry_price = 0.0

    async def update_pnl(self, trade_result: Dict[str, Any]):
        """Calculate and update running PnL."""
        try:
            entry_price = trade_result.get('entry_price', 0)
            exit_price = trade_result.get('exit_price', 0)
            amount = trade_result.get('amount', 0)

            if entry_price > 0 and exit_price > 0 and amount > 0:
                trade_pnl = (exit_price - entry_price) * amount
                self.total_pnl += trade_pnl

                self.agent_logger.info(f"Trade PnL: ${trade_pnl:.2f} | Total PnL: ${self.total_pnl:.2f}")

                # Update in database
                await self.update_agent_stats()

        except Exception as e:
            self.agent_logger.error(f"Error updating PnL: {e}")

    async def save_trade_to_db(self, trade_data: Dict[str, Any]):
        """Save trade record to Supabase trades table."""
        try:
            result = self.supabase.table('trades').insert(trade_data).execute()
            self.agent_logger.debug(f"Trade saved to database: {result}")
        except Exception as e:
            self.agent_logger.error(f"Failed to save trade to database: {e}")

    async def update_agent_status(self, status: str):
        """Update agent status in Supabase agents table."""
        try:
            self.supabase.table('agents').update({
                'status': status,
                'last_updated': datetime.utcnow().isoformat()
            }).eq('id', self.agent_id).execute()
        except Exception as e:
            self.agent_logger.error(f"Failed to update agent status: {e}")

    async def update_agent_stats(self):
        """Update agent statistics in agent_stats table."""
        try:
            stats_data = {
                'agent_id': self.agent_id,
                'total_pnl': self.total_pnl,
                'trade_count': self.trade_count,
                'win_count': self.trade_count,  # Simplified - could track wins/losses separately
                'loss_count': 0,
                'last_trade_at': self.last_trade_at.isoformat() if self.last_trade_at else None,
                'status': 'ACTIVE'
            }

            # Upsert to handle both new and existing records
            self.supabase.table('agent_stats').upsert(
                stats_data,
                on_conflict='agent_id'
            ).execute()

        except Exception as e:
            self.agent_logger.error(f"Failed to update agent stats: {e}")

    def get_status(self) -> Dict[str, Any]:
        """Get current agent status."""
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'strategy': self.strategy_type,
            'pair': self.token_pair,
            'is_active': self.is_active,
            'last_trade_at': self.last_trade_at.isoformat() if self.last_trade_at else None,
            'total_pnl': self.total_pnl,
            'trade_count': self.trade_count,
            'has_position': self.position is not None
        }
