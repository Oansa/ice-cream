"""State management for block-based strategy execution."""
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import logging

logger = logging.getLogger("ice_cream_runner")


@dataclass
class IndicatorState:
    """State for indicator calculations."""
    name: str
    period: int
    values: deque = field(default_factory=lambda: deque(maxlen=1000))

    def add_value(self, value: float):
        """Add a new value to the series."""
        self.values.append(value)

    def get_current(self) -> Optional[float]:
        """Get the current indicator value."""
        if len(self.values) == 0:
            return None
        return self.values[-1]

    def get_previous(self) -> Optional[float]:
        """Get the previous indicator value."""
        if len(self.values) < 2:
            return None
        return self.values[-2]


@dataclass
class CrossState:
    """State for cross detection (crosses-above, crosses-below)."""
    series_a_id: str
    series_b_id: str
    previous_a: Optional[float] = None
    previous_b: Optional[float] = None

    def update(self, current_a: float, current_b: float) -> Tuple[bool, bool]:
        """
        Update state and detect crosses.
        Returns: (crossed_above, crossed_below)
        """
        crossed_above = False
        crossed_below = False

        if self.previous_a is not None and self.previous_b is not None:
            # Cross above: was below, now above
            if self.previous_a <= self.previous_b and current_a > current_b:
                crossed_above = True
            # Cross below: was above, now below
            if self.previous_a >= self.previous_b and current_a < current_b:
                crossed_below = True

        self.previous_a = current_a
        self.previous_b = current_b
        return crossed_above, crossed_below


@dataclass
class ExecutionState:
    """State for execution blocks (cooldowns, duration tracking)."""
    last_execution: Optional[datetime] = None
    entry_price: Optional[float] = None
    entry_time: Optional[datetime] = None

    def can_execute(self, cooldown_seconds: int = 0) -> bool:
        """Check if enough time has passed since last execution."""
        if self.last_execution is None:
            return True
        elapsed = (datetime.utcnow() - self.last_execution).total_seconds()
        return elapsed >= cooldown_seconds

    def record_execution(self, price: Optional[float] = None):
        """Record that an execution occurred."""
        self.last_execution = datetime.utcnow()
        if price is not None:
            self.entry_price = price
            self.entry_time = self.last_execution


@dataclass
class PositionState:
    """State for position tracking."""
    is_open: bool = False
    entry_price: float = 0.0
    size: float = 0.0
    side: str = ""  # 'long' or 'short'
    open_time: Optional[datetime] = None

    @property
    def unrealized_pnl_pct(self, current_price: float = 0.0) -> float:
        """Calculate unrealized PnL percentage."""
        if not self.is_open or self.entry_price == 0:
            return 0.0
        if self.side == 'long':
            return (current_price - self.entry_price) / self.entry_price * 100
        elif self.side == 'short':
            return (self.entry_price - current_price) / self.entry_price * 100
        return 0.0

    def open(self, price: float, size: float, side: str):
        """Open a position."""
        self.is_open = True
        self.entry_price = price
        self.size = size
        self.side = side
        self.open_time = datetime.utcnow()

    def close(self):
        """Close the position."""
        self.is_open = False
        self.entry_price = 0.0
        self.size = 0.0
        self.side = ""
        self.open_time = None


class BlockStateCache:
    """Cache for block execution states."""

    def __init__(self):
        self.indicator_states: Dict[str, IndicatorState] = {}
        self.cross_states: Dict[str, CrossState] = {}
        self.execution_states: Dict[str, ExecutionState] = {}
        self.position_state = PositionState()
        self.block_values: Dict[str, Any] = {}  # Last computed value per block
        self.market_data: Dict[str, Any] = {}
        self.last_update: Optional[datetime] = None

    # Indicator methods
    def get_indicator_state(self, block_id: str, name: str, period: int) -> IndicatorState:
        """Get or create indicator state for a block."""
        if block_id not in self.indicator_states:
            self.indicator_states[block_id] = IndicatorState(name=name, period=period)
        return self.indicator_states[block_id]

    # Cross detection methods
    def get_cross_state(self, block_id: str, series_a_id: str, series_b_id: str) -> CrossState:
        """Get or create cross detection state."""
        if block_id not in self.cross_states:
            self.cross_states[block_id] = CrossState(
                series_a_id=series_a_id,
                series_b_id=series_b_id
            )
        return self.cross_states[block_id]

    # Execution methods
    def get_execution_state(self, block_id: str) -> ExecutionState:
        """Get or create execution state."""
        if block_id not in self.execution_states:
            self.execution_states[block_id] = ExecutionState()
        return self.execution_states[block_id]

    # Block value methods
    def set_block_value(self, block_id: str, value: Any):
        """Store computed value for a block."""
        self.block_values[block_id] = value

    def get_block_value(self, block_id: str) -> Any:
        """Get last computed value for a block."""
        return self.block_values.get(block_id)

    def get_input_value(self, source_id: str, source_handle: str) -> Any:
        """Get value from an output port of a source block."""
        # Most blocks output a single scalar/series value
        return self.block_values.get(source_id)

    # Market data methods
    def update_market_data(self, data: Dict[str, Any]):
        """Update current market data."""
        self.market_data = data
        self.last_update = datetime.utcnow()

    def get_current_price(self) -> Optional[float]:
        """Get current market price."""
        return self.market_data.get('last')

    def get_ohlc_data(self) -> List[Dict[str, Any]]:
        """Get current OHLC data for calculations."""
        return self.market_data.get('ohlc', [])

    # Position methods
    def get_position_state(self) -> PositionState:
        """Get current position state."""
        return self.position_state

    # Reset methods
    def reset_execution_state(self, block_id: str):
        """Reset state for a specific execution block."""
        if block_id in self.execution_states:
            del self.execution_states[block_id]

    def clear(self):
        """Clear all cached state."""
        self.indicator_states.clear()
        self.cross_states.clear()
        self.execution_states.clear()
        self.position_state = PositionState()
        self.block_values.clear()
        self.market_data.clear()
        self.last_update = None