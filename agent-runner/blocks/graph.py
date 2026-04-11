"""Strategy graph data structures for block-based trading strategies."""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set
import logging

logger = logging.getLogger("ice_cream_runner")


@dataclass
class BlockNode:
    """Represents a single block in the strategy graph."""
    id: str
    defId: str  # e.g., 'price', 'rsi', 'greater-than', 'market-buy'
    config: Dict[str, Any] = field(default_factory=dict)

    @property
    def category(self) -> str:
        """Derive category from defId."""
        category_map = {
            'trading-pair': 'market',
            'market-type': 'market',
            'timeframe': 'market',
            'price': 'data',
            'volume': 'data',
            'indicator': 'data',
            'greater-than': 'condition',
            'less-than': 'condition',
            'crosses-above': 'condition',
            'crosses-below': 'condition',
            'and': 'logic',
            'or': 'logic',
            'not': 'logic',
            'buy-signal': 'signal',
            'sell-signal': 'signal',
            'market-buy': 'execution',
            'market-sell': 'execution',
            'limit-buy': 'execution',
            'limit-sell': 'execution',
            'position-size': 'position',
            'max-positions': 'position',
            'stop-loss': 'risk',
            'take-profit': 'risk',
            'trailing-stop': 'risk',
            'cooldown': 'trade-control',
            'max-duration': 'trade-control',
            're-entry': 'trade-control',
            'run-loop': 'automation',
            'interval': 'automation',
            'trigger': 'automation',
        }
        return category_map.get(self.defId, 'unknown')

    @property
    def name(self) -> str:
        """Get human-readable name from defId."""
        return self.defId.replace('-', ' ').title()


@dataclass
class BlockEdge:
    """Represents a connection between two blocks."""
    source: str  # Source node ID
    sourceHandle: str  # Port ID on source
    target: str  # Target node ID
    targetHandle: str  # Port ID on target


@dataclass
class StrategyGraph:
    """Complete strategy graph as defined by the frontend."""
    version: str = "1.0"
    nodes: List[BlockNode] = field(default_factory=list)
    edges: List[BlockEdge] = field(default_factory=list)

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> 'StrategyGraph':
        """Parse strategy graph from JSON (frontend format)."""
        try:
            nodes = [
                BlockNode(
                    id=n['id'],
                    defId=n['defId'],
                    config=n.get('config', {})
                )
                for n in data.get('nodes', [])
            ]

            edges = [
                BlockEdge(
                    source=e['source'],
                    sourceHandle=e['sourceHandle'],
                    target=e['target'],
                    targetHandle=e['targetHandle']
                )
                for e in data.get('edges', [])
            ]

            return cls(
                version=data.get('version', '1.0'),
                nodes=nodes,
                edges=edges
            )
        except (KeyError, TypeError) as e:
            logger.error(f"Failed to parse strategy graph: {e}")
            raise ValueError(f"Invalid strategy graph format: {e}")

    def to_execution_order(self) -> List[BlockNode]:
        """Return nodes in topological execution order (DAG)."""
        # Build adjacency list
        adjacency: Dict[str, Set[str]] = {n.id: set() for n in self.nodes}
        in_degree: Dict[str, int] = {n.id: 0 for n in self.nodes}

        node_map = {n.id: n for n in self.nodes}

        for edge in self.edges:
            if edge.source in adjacency and edge.target in adjacency:
                adjacency[edge.source].add(edge.target)
                in_degree[edge.target] += 1

        # Kahn's algorithm for topological sort
        queue = [n_id for n_id, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            # Process nodes in deterministic order
            queue.sort()
            current_id = queue.pop(0)

            if current_id in node_map:
                result.append(node_map[current_id])

            for neighbor in adjacency[current_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(self.nodes):
            logger.error("Cycle detected in strategy graph")
            raise ValueError("Strategy graph contains a cycle")

        # Reverse to get execution order (dependencies first)
        return list(reversed(result))

    def get_incoming_edges(self, node_id: str) -> List[BlockEdge]:
        """Get all edges targeting a specific node."""
        return [e for e in self.edges if e.target == node_id]

    def get_outgoing_edges(self, node_id: str) -> List[BlockEdge]:
        """Get all edges originating from a specific node."""
        return [e for e in self.edges if e.source == node_id]

    def get_source_value(self, edge: BlockEdge) -> Any:
        """Get the value from the source node of an edge."""
        # This will be populated during execution
        pass

    def get_automation_block(self) -> Optional[BlockNode]:
        """Get the automation/trigger block that controls execution timing."""
        for node in self.nodes:
            if node.category == 'automation':
                return node
        return None

    def get_market_context(self) -> Optional[BlockNode]:
        """Get the market block that defines the trading pair/timeframe."""
        for node in self.nodes:
            if node.category == 'market':
                return node
        return None

    def get_execution_blocks(self) -> List[BlockNode]:
        """Get all execution blocks (orders to place)."""
        return [n for n in self.nodes if n.category == 'execution']

    def validate_connections(self) -> List[str]:
        """Validate all edges have valid handles according to block schemas.

        Returns:
            List of validation error messages (empty if all valid)
        """
        from .definitions import validate_connection

        errors = []
        node_map = {n.id: n for n in self.nodes}

        for edge in self.edges:
            source_node = node_map.get(edge.source)
            target_node = node_map.get(edge.target)

            # Check nodes exist
            if not source_node:
                errors.append(f"Edge source node '{edge.source}' not found in graph")
                continue

            if not target_node:
                errors.append(f"Edge target node '{edge.target}' not found in graph")
                continue

            # Validate the connection
            valid, error_msg = validate_connection(
                source_node.defId,
                edge.sourceHandle,
                target_node.defId,
                edge.targetHandle
            )

            if not valid:
                errors.append(
                    f"Invalid edge {edge.source} ({edge.sourceHandle}) "
                    f"→ {edge.target} ({edge.targetHandle}): {error_msg}"
                )

        return errors
