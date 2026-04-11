"""Block type definitions and validation for visual strategy builder.

Defines all 30+ supported block types with their input/output schemas.
This enables users to understand what connections are possible and validates
strategy graphs before execution.
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

# ============================================================================
# BLOCK SCHEMAS - Define all block types with their inputs/outputs
# ============================================================================

BLOCK_SCHEMAS: Dict[str, Dict] = {
    # ========================================================================
    # MARKET CONFIGURATION (3 blocks)
    # ========================================================================
    "trading-pair": {
        "category": "market",
        "description": "Defines the trading pair and market context",
        "outputs": ["pair"],  # {pair, base, quote, kraken_pair}
    },
    "timeframe": {
        "category": "market",
        "description": "Sets the candle timeframe for analysis",
        "outputs": ["timeframe"],  # {timeframe: str, interval: int}
    },
    "market-type": {
        "category": "market",
        "description": "Specifies market type (spot/margin/futures)",
        "outputs": ["type"],  # "spot" | "margin" | "futures"
    },

    # ========================================================================
    # DATA SOURCES (3 blocks)
    # ========================================================================
    "price": {
        "category": "data",
        "description": "Gets current market price and timestamp",
        "outputs": [
            "value",      # Current price as float
            "timestamp"   # Unix timestamp
        ],
    },
    "volume": {
        "category": "data",
        "description": "Returns 24-hour trading volume",
        "outputs": ["value"],  # 24h volume as float
    },
    "indicator": {
        "category": "data",
        "description": "Calculates technical indicators (RSI, EMA, MACD, Bollinger Bands)",
        "inputs": ["price"],  # Price series input
        "outputs": [
            "value",      # Current indicator value
            "history"     # Array of historical values for crosses/patterns
        ],
    },

    # ========================================================================
    # CONDITION BLOCKS (4 blocks)
    # ========================================================================
    "greater-than": {
        "category": "condition",
        "description": "Compares: a > b",
        "inputs": ["a", "b"],
        "outputs": ["result"],  # Boolean
    },
    "less-than": {
        "category": "condition",
        "description": "Compares: a < b",
        "inputs": ["a", "b"],
        "outputs": ["result"],  # Boolean
    },
    "crosses-above": {
        "category": "condition",
        "description": "Detects when series A crosses above series B (stateful)",
        "inputs": ["a", "b"],
        "outputs": ["result"],  # Boolean - true only on cross moment
    },
    "crosses-below": {
        "category": "condition",
        "description": "Detects when series A crosses below series B (stateful)",
        "inputs": ["a", "b"],
        "outputs": ["result"],  # Boolean - true only on cross moment
    },

    # ========================================================================
    # LOGIC GATES (3 blocks) - Support multiple inputs!
    # ========================================================================
    "and": {
        "category": "logic",
        "description": "Logical AND gate - all inputs must be true. Accepts 1-5 inputs.",
        "inputs": [
            "input1", "input2", "input3", "input4", "input5"
        ],
        "outputs": ["result"],  # Boolean
    },
    "or": {
        "category": "logic",
        "description": "Logical OR gate - any input true. Accepts 1-5 inputs.",
        "inputs": [
            "input1", "input2", "input3", "input4", "input5"
        ],
        "outputs": ["result"],  # Boolean
    },
    "not": {
        "category": "logic",
        "description": "Logical NOT gate - inverts input",
        "inputs": ["value"],
        "outputs": ["result"],  # Boolean
    },

    # ========================================================================
    # SIGNAL BLOCKS (2 blocks)
    # ========================================================================
    "buy-signal": {
        "category": "signal",
        "description": "Emits buy signal when gate is true",
        "inputs": ["gate"],  # Boolean gate
        "outputs": ["signal"],  # Emitted signal
    },
    "sell-signal": {
        "category": "signal",
        "description": "Emits sell signal when gate is true",
        "inputs": ["gate"],  # Boolean gate
        "outputs": ["signal"],  # Emitted signal
    },

    # ========================================================================
    # EXECUTION BLOCKS (4 blocks)
    # ========================================================================
    "market-buy": {
        "category": "execution",
        "description": "Places a market buy order",
        "inputs": ["signal", "size"],  # Signal trigger, optional size override
        "outputs": ["entry"],  # Entry price when executed
    },
    "market-sell": {
        "category": "execution",
        "description": "Places a market sell order",
        "inputs": ["signal"],
        "outputs": ["exit"],  # Exit price
    },
    "limit-buy": {
        "category": "execution",
        "description": "Places a limit buy order",
        "inputs": ["signal", "price", "size"],
        "outputs": ["entry"],
    },
    "limit-sell": {
        "category": "execution",
        "description": "Places a limit sell order",
        "inputs": ["signal", "price"],
        "outputs": ["exit"],
    },

    # ========================================================================
    # RISK MANAGEMENT (3 blocks)
    # ========================================================================
    "stop-loss": {
        "category": "risk",
        "description": "Triggers sell if loss exceeds percentage. Requires entry price.",
        "inputs": ["entry_price"],  # From market-buy
        "outputs": ["signal"],  # Sell trigger signal
    },
    "take-profit": {
        "category": "risk",
        "description": "Triggers sell if profit reaches target percentage",
        "inputs": ["entry_price"],  # From market-buy
        "outputs": ["signal"],  # Sell trigger signal
    },
    "trailing-stop": {
        "category": "risk",
        "description": "Dynamic stop that follows price upward",
        "inputs": ["entry_price", "current_price"],
        "outputs": ["signal"],  # Sell trigger signal
    },

    # ========================================================================
    # POSITION MANAGEMENT (2 blocks)
    # ========================================================================
    "position-size": {
        "category": "position",
        "description": "Specifies position size in USD or portfolio percentage",
        "outputs": ["size"],  # Position size value
    },
    "max-positions": {
        "category": "position",
        "description": "Sets maximum number of concurrent open positions",
        "outputs": ["limit"],  # Max position count
    },

    # ========================================================================
    # TRADE CONTROL (3 blocks)
    # ========================================================================
    "cooldown": {
        "category": "trade-control",
        "description": "Enforces minimum time between trades. Pass-through filter.",
        "inputs": ["signal"],
        "outputs": ["signal"],  # Pass through only if cooldown passed
    },
    "max-duration": {
        "category": "trade-control",
        "description": "Auto-closes position after time limit",
        "inputs": ["entry"],
        "outputs": ["signal"],  # Triggers exit when max time reached
    },
    "re-entry": {
        "category": "trade-control",
        "description": "Controls whether multiple entries are allowed",
        "inputs": ["signal"],
        "outputs": ["signal"],  # Allow/block re-entry
    },

    # ========================================================================
    # AUTOMATION/TIMING (3 blocks)
    # ========================================================================
    "run-loop": {
        "category": "automation",
        "description": "Continuous execution loop. Fires every cycle.",
        "outputs": ["trigger"],
    },
    "interval": {
        "category": "automation",
        "description": "Execute at specified time interval",
        "outputs": ["trigger"],
    },
    "trigger": {
        "category": "automation",
        "description": "Event-based trigger (e.g., on new candle)",
        "outputs": ["trigger"],
    },
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_schema(block_def_id: str) -> Dict:
    """Get the complete schema for a block type.

    Args:
        block_def_id: Block type identifier (e.g., 'and', 'price', 'market-buy')

    Returns:
        Block schema dictionary with category, description, inputs, outputs
    """
    return BLOCK_SCHEMAS.get(block_def_id, {})


def get_block_inputs(block_def_id: str) -> List[str]:
    """Get all input handle names for a block type.

    Args:
        block_def_id: Block type identifier

    Returns:
        List of input handle names (empty if no inputs)
    """
    schema = get_schema(block_def_id)
    return schema.get("inputs", [])


def get_block_outputs(block_def_id: str) -> List[str]:
    """Get all output handle names for a block type.

    Args:
        block_def_id: Block type identifier

    Returns:
        List of output handle names (empty if no outputs)
    """
    schema = get_schema(block_def_id)
    return schema.get("outputs", [])


def validate_connection(
    source_block_def_id: str,
    source_handle: str,
    target_block_def_id: str,
    target_handle: str
) -> Tuple[bool, Optional[str]]:
    """Validate if a connection between two blocks is allowed.

    Checks that:
    1. Source block exists and has the output handle
    2. Target block exists and has the input handle

    Args:
        source_block_def_id: Source block type
        source_handle: Output handle name on source block
        target_block_def_id: Target block type
        target_handle: Input handle name on target block

    Returns:
        Tuple of (is_valid: bool, error_message: Optional[str])
    """
    source_schema = get_schema(source_block_def_id)
    target_schema = get_schema(target_block_def_id)

    # Check source block exists
    if not source_schema:
        return False, f"Unknown block type: {source_block_def_id}"

    # Check target block exists
    if not target_schema:
        return False, f"Unknown block type: {target_block_def_id}"

    # Check source has the output handle
    source_outputs = source_schema.get("outputs", [])
    if source_handle not in source_outputs:
        return False, (
            f"Block '{source_block_def_id}' has no output '{source_handle}'. "
            f"Available: {source_outputs}"
        )

    # Check target has the input handle
    target_inputs = target_schema.get("inputs", [])
    if target_handle not in target_inputs:
        return False, (
            f"Block '{target_block_def_id}' has no input '{target_handle}'. "
            f"Available: {target_inputs}"
        )

    return True, None


def validate_block_config(block_def_id: str, config: Dict) -> Tuple[bool, Optional[str]]:
    """Validate block configuration (optional - for future use).

    Could check that required config fields are present, values are in range, etc.
    """
    # For now, all configs are valid - this is extensible
    return True, None


def get_all_blocks_by_category(category: str) -> Dict[str, Dict]:
    """Get all blocks in a specific category.

    Args:
        category: Category name (e.g., 'market', 'data', 'condition', 'logic', etc.)

    Returns:
        Dictionary of {block_def_id: schema} for all blocks in category
    """
    return {
        block_id: schema
        for block_id, schema in BLOCK_SCHEMAS.items()
        if schema.get("category") == category
    }


def get_all_categories() -> List[str]:
    """Get all unique block categories."""
    categories = set()
    for schema in BLOCK_SCHEMAS.values():
        cat = schema.get("category")
        if cat:
            categories.add(cat)
    return sorted(list(categories))


# ============================================================================
# BLOCK REGISTRY - For future enhanced features
# ============================================================================

@dataclass
class BlockHandle:
    """Represents a single input or output handle on a block."""
    name: str
    data_type: str  # e.g., 'number', 'boolean', 'string', 'object', 'array'
    description: str = ""
    optional: bool = False


class BlockDefinition:
    """Enhanced block definition with type information (future-proof)."""

    def __init__(self, block_def_id: str):
        self.block_def_id = block_def_id
        self.schema = get_schema(block_def_id)

    @property
    def category(self) -> str:
        return self.schema.get("category", "unknown")

    @property
    def description(self) -> str:
        return self.schema.get("description", "")

    @property
    def inputs(self) -> List[str]:
        return self.schema.get("inputs", [])

    @property
    def outputs(self) -> List[str]:
        return self.schema.get("outputs", [])

    def is_valid_output(self, handle: str) -> bool:
        return handle in self.outputs

    def is_valid_input(self, handle: str) -> bool:
        return handle in self.inputs
