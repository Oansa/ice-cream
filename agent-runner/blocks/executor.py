"""Block-based strategy executor - the main execution engine."""
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger("ice_cream_runner")

from .graph import StrategyGraph, BlockNode, BlockEdge
from .state import BlockStateCache
from .handlers import BlockHandlerRegistry


class BlockExecutionError(Exception):
    """Exception raised during block execution."""
    pass


@dataclass
class ExecutionResult:
    """Result of executing one strategy cycle."""
    orders: List[Dict]
    events: List[Dict]
    block_values: Dict[str, Any]
    timestamp: datetime

    def has_orders(self) -> bool:
        """Check if any orders were generated."""
        return len(self.orders) > 0

    def get_buy_orders(self) -> List[Dict]:
        """Get all buy orders."""
        return [o for o in self.orders if o['order'].get('direction') == 'buy']

    def get_sell_orders(self) -> List[Dict]:
        """Get all sell orders."""
        return [o for o in self.orders if o['order'].get('direction') == 'sell']


class BlockExecutor:
    """Executor for block-based trading strategies."""

    def __init__(self, graph: StrategyGraph, handler_registry: Optional[BlockHandlerRegistry] = None):
        self.graph = graph
        self.handlers = handler_registry or BlockHandlerRegistry()
        self.state_cache = BlockStateCache()
        self.execution_order: List[BlockNode] = []
        self._initialized = False

    async def initialize(self):
        """Initialize the executor - compute execution order and validate.

        Raises:
            BlockExecutionError: If graph validation fails
        """
        try:
            # Validate graph connections
            validation_errors = self.graph.validate_connections()
            if validation_errors:
                error_msg = "Graph validation failed:\n" + "\n".join(
                    f"  - {e}" for e in validation_errors
                )
                logger.error(error_msg)
                raise BlockExecutionError(error_msg)

            self.execution_order = self.graph.to_execution_order()
            self._initialized = True
            logger.info(f"Block executor initialized with {len(self.execution_order)} blocks")
        except ValueError as e:
            raise BlockExecutionError(f"Failed to initialize executor: {e}")

    async def execute_cycle(self, market_data: Dict[str, Any]) -> ExecutionResult:
        """
        Execute one full cycle of the strategy graph.

        Args:
            market_data: Current market data including price, volume, OHLC

        Returns:
            ExecutionResult with orders and events
        """
        if not self._initialized:
            await self.initialize()

        # Update market data in state cache
        self.state_cache.update_market_data(market_data)

        # Execute blocks in topological order
        block_results: Dict[str, Any] = {}
        orders: List[Dict] = []
        events: List[Dict] = []

        for block in self.execution_order:
            try:
                result = await self._execute_block(block, block_results)
                block_results[block.id] = result
                self.state_cache.set_block_value(block.id, result)

                # Collect execution results
                if block.category == 'execution' and result:
                    orders.append({
                        'block_id': block.id,
                        'block_type': block.defId,
                        'order': result,
                        'timestamp': datetime.utcnow().isoformat()
                    })

                # Collect signal events
                if block.category == 'signal' and result:
                    events.append({
                        'block_id': block.id,
                        'signal': result,
                        'timestamp': datetime.utcnow().isoformat()
                    })

            except Exception as e:
                logger.error(f"Error executing block {block.id} ({block.defId}): {e}")
                # Continue with other blocks

        return ExecutionResult(
            orders=orders,
            events=events,
            block_values=block_results,
            timestamp=datetime.utcnow()
        )

    async def _execute_block(
        self,
        block: BlockNode,
        block_results: Dict[str, Any]
    ) -> Any:
        """Execute a single block."""
        handler = self.handlers.get_handler(block)

        if handler is None:
            logger.warning(f"No handler for block type: {block.defId}")
            return None

        # Gather inputs from incoming edges
        inputs = self._gather_inputs(block, block_results)

        # Log available outputs for debugging (schema-aware)
        try:
            from .definitions import get_block_outputs
            available_outputs = get_block_outputs(block.defId)
            if available_outputs:
                logger.debug(
                    f"Executing block '{block.id}' ({block.defId}) "
                    f"with {len(inputs)} inputs, outputs available: {available_outputs}"
                )
        except Exception:
            pass  # Silently continue if schema not available

        # Execute the block
        try:
            result = await handler.execute(block, inputs, self.state_cache)
            return result
        except Exception as e:
            logger.error(f"Handler execution failed for {block.defId}: {e}")
            raise BlockExecutionError(f"Block {block.id} execution failed: {e}")

    def _gather_inputs(
        self,
        block: BlockNode,
        block_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Gather input values from connected source blocks."""
        inputs = {}
        incoming = self.graph.get_incoming_edges(block.id)

        for edge in incoming:
            source_value = block_results.get(edge.source)

            # Handle the case where source output is a dict (e.g., market context)
            if isinstance(source_value, dict):
                # Pass the whole dict as input
                inputs[edge.targetHandle] = source_value
                # Also extract common fields
                if 'last' in source_value:
                    inputs['price'] = source_value['last']
            else:
                # Map input to the target handle
                inputs[edge.targetHandle] = source_value

        return inputs

    def get_execution_interval(self) -> int:
        """Get the execution interval from automation blocks."""
        auto_block = self.graph.get_automation_block()
        if auto_block:
            if auto_block.defId == 'interval':
                return auto_block.config.get('seconds', 60)
            elif auto_block.defId == 'timeframe':
                # Map timeframe to seconds
                tf_map = {
                    '1m': 60,
                    '5m': 300,
                    '15m': 900,
                    '1h': 3600,
                    '4h': 14400,
                    '1d': 86400
                }
                return tf_map.get(auto_block.config.get('tf'), 60)
        return 60  # Default 60 seconds

    def get_trading_pair(self) -> Optional[str]:
        """Get the trading pair from market blocks."""
        market_block = self.graph.get_market_context()
        if market_block and market_block.defId == 'trading-pair':
            return market_block.config.get('pair', 'BTC/USDT')
        return None

    def reset(self):
        """Reset the executor state."""
        self.state_cache.clear()
        self._initialized = False