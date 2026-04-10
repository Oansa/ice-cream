"""Sniper strategy implementation for new token listings."""
import logging
from typing import Dict, Any

logger = logging.getLogger("ice_cream_runner")


class SniperStrategy:
    """Sniper strategy - attempts to buy newly listed tokens with thin orderbooks."""

    def __init__(self):
        self.name = "SNIPER"
        self.min_spread_threshold = 0.02  # 2% spread indicates thin liquidity
        self.max_book_depth = 10  # Maximum depth to consider "thin"

    def should_buy(self, pair: str, orderbook: Dict[str, Any]) -> bool:
        """Check if orderbook conditions suggest a new listing opportunity.

        Looks for:
        - Thin orderbook (low liquidity)
        - Wide bid-ask spread
        - Limited depth on either side

        Args:
            pair: Trading pair symbol
            orderbook: Orderbook data from Kraken

        Returns:
            True if conditions suggest a snipe opportunity
        """
        if not orderbook:
            logger.debug("No orderbook data available for sniper evaluation")
            return False

        # Extract bids and asks
        bids = orderbook.get('bids', [])
        asks = orderbook.get('asks', [])

        if not bids or not asks:
            logger.debug("Empty orderbook - possible new listing")
            return True

        # Calculate spread
        try:
            best_bid = float(bids[0][0]) if isinstance(bids[0], (list, tuple)) else float(bids[0].get('price', 0))
            best_ask = float(asks[0][0]) if isinstance(asks[0], (list, tuple)) else float(asks[0].get('price', 0))

            if best_bid <= 0:
                logger.debug("Invalid bid price in orderbook")
                return False

            spread = (best_ask - best_bid) / best_bid

            # Check for wide spread indicating low liquidity
            if spread > self.min_spread_threshold:
                logger.debug(f"Wide spread detected: {spread:.2%} > {self.min_spread_threshold:.2%}")
                return True

            # Check for shallow book depth
            if len(bids) < self.max_book_depth or len(asks) < self.max_book_depth:
                logger.debug(f"Shallow orderbook: {len(bids)} bids, {len(asks)} asks")
                return True

            logger.debug(f"Orderbook looks liquid: spread={spread:.2%}, depth=bids:{len(bids)}, asks:{len(asks)}")

        except (IndexError, KeyError, ValueError) as e:
            logger.warning(f"Error parsing orderbook: {e}")
            return False

        return False

    def calculate_snipe_size(self, position_size_usd: float, current_price: float) -> float:
        """Calculate position size for sniper entry.

        For sniper strategies, we typically want to use a smaller portion
        of the allocated capital due to higher risk.

        Args:
            position_size_usd: Total position size in USD
            current_price: Current asset price

        Returns:
            Amount of base currency to buy
        """
        # Use 25% of allocated size for sniper entries (risk management)
        snipe_allocation = position_size_usd * 0.25

        if current_price <= 0:
            return 0.0

        base_amount = snipe_allocation / current_price

        logger.debug(f"Sniper size calculation: USD={snipe_allocation}, price={current_price}, amount={base_amount:.6f}")

        return base_amount

    def calculate_exit_price(self, entry_price: float, profit_target_pct: float = 50.0) -> float:
        """Calculate target exit price for sniper position.

        Sniper strategies typically aim for high returns on successful snipes.

        Args:
            entry_price: Entry price
            profit_target_pct: Profit target percentage (default 50%)

        Returns:
            Target exit price
        """
        return entry_price * (1 + profit_target_pct / 100)
