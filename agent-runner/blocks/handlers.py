"""Block handlers for executing different block types."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
import logging

logger = logging.getLogger("ice_cream_runner")

from .graph import BlockNode
from .state import BlockStateCache


class BlockHandler(ABC):
    """Base class for block handlers."""

    @property
    @abstractmethod
    def supported_blocks(self) -> List[str]:
        """List of block defIds this handler supports."""
        pass

    @abstractmethod
    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Any:
        """Execute the block and return the output value."""
        pass


class MarketHandler(BlockHandler):
    """Handler for market blocks (trading-pair, timeframe, market-type)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['trading-pair', 'market-type', 'timeframe']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Dict[str, Any]:
        """Return market context configuration."""
        if block.defId == 'trading-pair':
            pair = block.config.get('pair', 'BTC/USDT')
            # Normalize to Kraken format
            kraken_pair = self._normalize_pair(pair)
            return {
                'pair': pair,
                'kraken_pair': kraken_pair,
                'base': pair.split('/')[0],
                'quote': pair.split('/')[1]
            }

        elif block.defId == 'timeframe':
            tf = block.config.get('tf', '1h')
            # Map to Kraken interval
            interval = self._map_timeframe(tf)
            return {
                'timeframe': tf,
                'interval': interval
            }

        elif block.defId == 'market-type':
            return {
                'type': block.config.get('type', 'spot')
            }

        return {}

    def _normalize_pair(self, pair: str) -> str:
        """Convert human-readable pair to Kraken format."""
        base, quote = pair.split('/')
        # Kraken uses XXBT for BTC, XETH for ETH, etc.
        kraken_map = {
            'BTC': 'XXBT',
            'ETH': 'XETH',
            'SOL': 'XSOL',
            'BNB': 'XBNB',
            'USDT': 'USDT',
            'USD': 'ZUSD'
        }
        kraken_base = kraken_map.get(base, base)
        kraken_quote = kraken_map.get(quote, quote)
        return f"{kraken_base}{kraken_quote}"

    def _map_timeframe(self, tf: str) -> int:
        """Map frontend timeframe to Kraken interval (minutes)."""
        timeframe_map = {
            '1m': 1,
            '5m': 5,
            '15m': 15,
            '1h': 60,
            '4h': 240,
            '1d': 1440,
            '1w': 10080
        }
        return timeframe_map.get(tf, 60)


class DataHandler(BlockHandler):
    """Handler for data blocks (price, volume, indicator)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['price', 'volume', 'indicator']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Any:
        """Return data series values."""
        market_data = state_cache.market_data

        if block.defId == 'price':
            # Return current price
            return market_data.get('last')

        elif block.defId == 'volume':
            # Return 24h volume
            volume_data = market_data.get('volume', [0, 0])
            return volume_data[1] if isinstance(volume_data, list) else volume_data

        elif block.defId == 'indicator':
            return await self._calculate_indicator(block, inputs, state_cache)

        return None

    async def _calculate_indicator(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Optional[float]:
        """Calculate technical indicator."""
        indicator_name = block.config.get('name', 'rsi')
        period = block.config.get('period', 14)
        source = inputs.get('source')  # Input series

        # Get OHLC data
        ohlc = state_cache.get_ohlc_data()
        if not ohlc:
            return None

        # Use closing prices
        prices = [candle.get('close', 0) for candle in ohlc[-period*3:]]
        if len(prices) < period:
            return None

        ind_state = state_cache.get_indicator_state(block.id, indicator_name, period)

        if indicator_name == 'rsi':
            value = self._calculate_rsi(prices, period)
        elif indicator_name == 'ema':
            value = self._calculate_ema(prices, period)
        elif indicator_name == 'macd':
            value = self._calculate_macd(prices)
        elif indicator_name == 'bollinger':
            band_type = block.config.get('band', 'middle')
            multiplier = block.config.get('multiplier', 2.0)
            value = self._calculate_bollinger(prices, period, band_type, multiplier)
        else:
            return None

        if value is None:
            return None

        ind_state.add_value(value if isinstance(value, float) else float(value))
        return value

    def _calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate RSI (Relative Strength Index)."""
        if len(prices) < period + 1:
            return 50.0

        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100.0

        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi, 2)

    def _calculate_ema(self, prices: List[float], period: int) -> float:
        """Calculate EMA (Exponential Moving Average)."""
        if len(prices) < period:
            return prices[-1] if prices else 0.0

        multiplier = 2 / (period + 1)
        ema = sum(prices[:period]) / period  # Start with SMA

        for price in prices[period:]:
            ema = (price - ema) * multiplier + ema

        return round(ema, 2)

    def _calculate_macd(self, prices: List[float]) -> float:
        """Calculate MACD line (simplified - returns MACD value)."""
        ema_12 = self._calculate_ema(prices, 12)
        ema_26 = self._calculate_ema(prices, 26)
        macd = ema_12 - ema_26
        return round(macd, 4)

    def _calculate_sma(self, prices: List[float], period: int) -> float:
        """Calculate simple moving average for prices."""
        if len(prices) < period:
            return round(prices[-1] if prices else 0.0, 4)
        values = prices[-period:]
        return round(sum(values) / len(values), 4)

    def _calculate_bollinger(
        self,
        prices: List[float],
        period: int,
        band_type: str = 'middle',
        multiplier: float = 2.0
    ) -> Optional[float]:
        """Calculate Bollinger Bands and return one of upper, middle, or lower band."""
        if len(prices) < period:
            return None

        window = prices[-period:]
        middle = self._calculate_sma(window, period)
        squared_diff = [(p - middle) ** 2 for p in window]
        variance = sum(squared_diff) / period
        stddev = variance ** 0.5

        upper = round(middle + multiplier * stddev, 4)
        lower = round(middle - multiplier * stddev, 4)

        bands = {
            'upper': upper,
            'middle': round(middle, 4),
            'lower': lower,
            'width': round(upper - lower, 4)
        }

        return bands.get(band_type, bands['middle'])


class ConditionHandler(BlockHandler):
    """Handler for condition blocks (greater-than, less-than, crosses-above, crosses-below)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['greater-than', 'less-than', 'crosses-above', 'crosses-below']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> bool:
        """Evaluate condition and return boolean."""
        a = inputs.get('a')
        b = inputs.get('b')

        # Handle constant value from config
        if b is None:
            b = block.config.get('bConst', 0)

        if a is None or b is None:
            return False

        if block.defId == 'greater-than':
            return a > b

        elif block.defId == 'less-than':
            return a < b

        elif block.defId == 'crosses-above':
            return self._check_cross(block, a, b, state_cache, 'above')

        elif block.defId == 'crosses-below':
            return self._check_cross(block, a, b, state_cache, 'below')

        return False

    def _check_cross(
        self,
        block: BlockNode,
        a: float,
        b: float,
        state_cache: BlockStateCache,
        direction: str
    ) -> bool:
        """Check for cross condition with state tracking."""
        # Get or create cross state
        cross_state = state_cache.get_cross_state(block.id, 'a', 'b')

        # Update and detect crosses
        crossed_above, crossed_below = cross_state.update(a, b)

        if direction == 'above':
            return crossed_above
        else:
            return crossed_below


class LogicHandler(BlockHandler):
    """Handler for logic blocks (and, or, not)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['and', 'or', 'not']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> bool:
        """Evaluate logic operation."""
        if block.defId == 'and':
            # Check all inputs (up to logicInputCount)
            values = [v for k, v in inputs.items() if k.startswith('in-')]
            if not values:
                return False
            return all(values)

        elif block.defId == 'or':
            values = [v for k, v in inputs.items() if k.startswith('in-')]
            if not values:
                return False
            return any(values)

        elif block.defId == 'not':
            value = inputs.get('in')
            return not value if value is not None else False

        return False


class SignalHandler(BlockHandler):
    """Handler for signal blocks (buy-signal, sell-signal)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['buy-signal', 'sell-signal']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Optional[Dict[str, Any]]:
        """Emit signal when gate condition is true."""
        gate = inputs.get('in')

        if gate is True:
            signal_type = 'buy' if block.defId == 'buy-signal' else 'sell'
            return {
                'type': signal_type,
                'timestamp': state_cache.last_update.isoformat() if state_cache.last_update else None,
                'price': state_cache.get_current_price()
            }

        return None


class ExecutionHandler(BlockHandler):
    """Handler for execution blocks (market-buy, market-sell, limit-buy, limit-sell)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['market-buy', 'market-sell', 'limit-buy', 'limit-sell']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Optional[Dict[str, Any]]:
        """Generate order parameters from signal."""
        signal = inputs.get('signal')

        if signal is None:
            return None

        # Get execution state for cooldown check
        exec_state = state_cache.get_execution_state(block.id)
        cooldown_minutes = 0

        # Check cooldown
        if not exec_state.can_execute(cooldown_minutes * 60):
            logger.debug(f"Execution blocked by cooldown for block {block.id}")
            return None

        order_type = self._get_order_type(block.defId)
        direction = self._get_direction(block.defId)

        order = {
            'type': order_type,
            'direction': direction,
            'amount_mode': block.config.get('amountMode', 'percent'),
            'amount': block.config.get('amount', 10),
        }

        if order_type == 'limit':
            order['price'] = inputs.get('price') or block.config.get('price', 0)

        # Record execution
        current_price = state_cache.get_current_price()
        exec_state.record_execution(current_price)

        return order

    def _get_order_type(self, defId: str) -> str:
        """Map block defId to order type."""
        if 'market' in defId:
            return 'market'
        elif 'limit' in defId:
            return 'limit'
        return 'market'

    def _get_direction(self, defId: str) -> str:
        """Map block defId to direction."""
        if 'buy' in defId:
            return 'buy'
        elif 'sell' in defId:
            return 'sell'
        return 'buy'


class RiskHandler(BlockHandler):
    """Handler for risk blocks (stop-loss, take-profit, trailing-stop)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['stop-loss', 'take-profit', 'trailing-stop']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Optional[Dict[str, Any]]:
        """Evaluate risk conditions and return order if triggered."""
        position = state_cache.get_position_state()

        if not position.is_open:
            return None

        current_price = state_cache.get_current_price()
        if current_price is None:
            return None

        pnl_pct = position.unrealized_pnl_pct(current_price)

        if block.defId == 'stop-loss':
            stop_pct = block.config.get('percent', 2)
            if pnl_pct <= -stop_pct:
                return {
                    'type': 'market',
                    'direction': 'sell',
                    'reason': 'stop_loss',
                    'trigger_price': current_price
                }

        elif block.defId == 'take-profit':
            tp_pct = block.config.get('percent', 5)
            if pnl_pct >= tp_pct:
                return {
                    'type': 'market',
                    'direction': 'sell',
                    'reason': 'take_profit',
                    'trigger_price': current_price
                }

        elif block.defId == 'trailing-stop':
            return await self._check_trailing_stop(block, position, current_price, state_cache)

        return None

    async def _check_trailing_stop(
        self,
        block: BlockNode,
        position: Any,
        current_price: float,
        state_cache: BlockStateCache
    ) -> Optional[Dict[str, Any]]:
        """Check trailing stop condition."""
        distance_pct = block.config.get('distance', 1.5)
        activate_immediately = block.config.get('activateImmediately', True)

        exec_state = state_cache.get_execution_state(block.id)

        if activate_immediately and exec_state.entry_price:
            highest_price = max(exec_state.entry_price, current_price)
            trail_price = highest_price * (1 - distance_pct / 100)

            if current_price <= trail_price:
                return {
                    'type': 'market',
                    'direction': 'sell',
                    'reason': 'trailing_stop',
                    'trigger_price': current_price
                }

        return None


class TradeControlHandler(BlockHandler):
    """Handler for trade control blocks (cooldown, max-duration, re-entry)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['cooldown', 'max-duration', 're-entry']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Dict[str, Any]:
        """Evaluate trade control conditions."""
        position = state_cache.get_position_state()

        if block.defId == 'cooldown':
            minutes = block.config.get('minutes', 15)
            return {'cooldown_seconds': minutes * 60}

        elif block.defId == 'max-duration':
            minutes = block.config.get('minutes', 120)
            if position.is_open and position.open_time:
                from datetime import datetime, timedelta
                elapsed = (datetime.utcnow() - position.open_time).total_seconds() / 60
                if elapsed >= minutes:
                    return {
                        'action': 'close',
                        'reason': 'max_duration',
                        'type': 'market',
                        'direction': 'sell'
                    }
            return {}

        elif block.defId == 're-entry':
            enabled = block.config.get('enabled', True)
            return {'reentry_allowed': enabled}

        return {}


class PositionHandler(BlockHandler):
    """Handler for position blocks (position-size, max-positions)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['position-size', 'max-positions']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> float:
        """Calculate position parameters."""
        if block.defId == 'position-size':
            return block.config.get('percent', 10)

        elif block.defId == 'max-positions':
            return block.config.get('count', 1)

        return 0.0


class AutomationHandler(BlockHandler):
    """Handler for automation blocks (run-loop, interval, trigger)."""

    @property
    def supported_blocks(self) -> List[str]:
        return ['run-loop', 'interval', 'trigger']

    async def execute(
        self,
        block: BlockNode,
        inputs: Dict[str, Any],
        state_cache: BlockStateCache
    ) -> Dict[str, Any]:
        """Return execution timing configuration."""
        if block.defId == 'run-loop':
            return {
                'mode': 'continuous',
                'enabled': block.config.get('enabled', True)
            }

        elif block.defId == 'interval':
            seconds = block.config.get('seconds', 60)
            return {
                'mode': 'interval',
                'interval_seconds': seconds
            }

        elif block.defId == 'trigger':
            event = block.config.get('event', 'onCandle')
            return {
                'mode': 'event',
                'event': event
            }

        return {'mode': 'interval', 'interval_seconds': 60}


class BlockHandlerRegistry:
    """Registry for block handlers."""

    def __init__(self):
        self.handlers: Dict[str, BlockHandler] = {}
        self._register_default_handlers()

    def _register_default_handlers(self):
        """Register all default block handlers."""
        handlers = [
            MarketHandler(),
            DataHandler(),
            ConditionHandler(),
            LogicHandler(),
            SignalHandler(),
            ExecutionHandler(),
            RiskHandler(),
            TradeControlHandler(),
            PositionHandler(),
            AutomationHandler(),
        ]

        for handler in handlers:
            for block_id in handler.supported_blocks:
                self.handlers[block_id] = handler

    def get_handler(self, block: BlockNode) -> Optional[BlockHandler]:
        """Get handler for a block."""
        return self.handlers.get(block.defId)

    def is_supported(self, defId: str) -> bool:
        """Check if a block type is supported."""
        return defId in self.handlers