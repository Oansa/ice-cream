"""DCA (Dollar Cost Averaging) strategy implementation."""
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger("ice_cream_runner")


class DCAStrategy:
    """Dollar Cost Averaging strategy - buys at regular intervals."""

    def __init__(self):
        self.name = "DCA"

    def should_buy(self, last_buy_timestamp: Optional[datetime], interval_hours: int) -> bool:
        """Determine if enough time has passed since last buy.

        Args:
            last_buy_timestamp: Timestamp of the last buy order (None if never bought)
            interval_hours: Hours to wait between purchases

        Returns:
            True if enough time has passed to make next purchase
        """
        if last_buy_timestamp is None:
            logger.debug("No previous buy - DCA should buy immediately")
            return True

        next_buy_time = last_buy_timestamp + timedelta(hours=interval_hours)
        should_buy = datetime.utcnow() >= next_buy_time

        if should_buy:
            logger.debug(f"DCA interval met: last buy at {last_buy_timestamp}, next at {next_buy_time}")
        else:
            time_until = next_buy_time - datetime.utcnow()
            logger.debug(f"DCA waiting: {time_until.total_seconds() / 3600:.1f} hours until next buy")

        return should_buy

    def calculate_dca_amount(self, position_size_usd: float, num_investments: int = 4) -> float:
        """Calculate the amount to invest per DCA purchase.

        Args:
            position_size_usd: Total USD amount allocated for DCA
            num_investments: Number of DCA purchases to split across (default: 4)

        Returns:
            Amount to invest per purchase in USD
        """
        if num_investments <= 0:
            num_investments = 4

        amount_per_purchase = position_size_usd / num_investments

        logger.debug(f"DCA amount calculation: total={position_size_usd}, splits={num_investments}, per_purchase={amount_per_purchase}")

        return amount_per_purchase

    def get_interval_seconds(self, interval_hours: int) -> int:
        """Convert hours to seconds for timer calculations."""
        return interval_hours * 3600
