"""Spot trading strategy implementation."""
import logging
from typing import List, Dict, Any

logger = logging.getLogger("ice_cream_runner")


class SpotStrategy:
    """Spot trading strategy with various trigger conditions."""

    def __init__(self):
        self.name = "SPOT"

    def should_buy(self, current_price: float, price_history: List[Dict[str, Any]], trigger_condition: str) -> bool:
        """Determine if a buy signal should be triggered.

        Args:
            current_price: Current market price
            price_history: List of historical price data points
            trigger_condition: The condition to evaluate (e.g., PRICE_DROP_5PCT)

        Returns:
            True if buy condition is met
        """
        if not price_history or len(price_history) < 2:
            logger.debug("Insufficient price history for evaluation")
            return False

        if trigger_condition == "PRICE_DROP_5PCT":
            return self._check_price_drop(current_price, price_history, 0.05)

        elif trigger_condition == "PRICE_DROP_10PCT":
            return self._check_price_drop(current_price, price_history, 0.10)

        elif trigger_condition == "VOLUME_SPIKE":
            return self._check_volume_spike(price_history)

        elif trigger_condition == "NEW_TOKEN_LAUNCH":
            logger.info("NEW_TOKEN_LAUNCH trigger requires mempool monitoring - not implemented")
            return False

        else:
            logger.warning(f"Unknown trigger condition: {trigger_condition}")
            return False

    def _check_price_drop(self, current_price: float, price_history: List[Dict[str, Any]], threshold: float) -> bool:
        """Check if price has dropped more than threshold percentage.

        Looks at the high price from the last hour and compares to current price.
        """
        # Get prices from last hour (assuming price_history contains hourly data)
        if len(price_history) < 2:
            return False

        # Find the high price in the last hour
        last_hour_data = price_history[-1] if len(price_history) >= 1 else None
        if not last_hour_data:
            return False

        # Check if 'high' key exists, otherwise use 'close' or 'last'
        hour_high = last_hour_data.get('high', last_hour_data.get('close', last_hour_data.get('last', current_price)))

        if hour_high == 0:
            return False

        price_drop = (hour_high - current_price) / hour_high

        logger.debug(f"Price drop check: hour_high={hour_high}, current={current_price}, drop={price_drop:.2%}, threshold={threshold:.2%}")

        return price_drop >= threshold

    def _check_volume_spike(self, price_history: List[Dict[str, Any]]) -> bool:
        """Check if 1h volume is more than 2x the 24h average volume."""
        if len(price_history) < 2:
            return False

        # Get last hour volume
        last_hour = price_history[-1]
        last_volume = last_hour.get('volume', 0)

        # Calculate 24h average (use up to 24 data points)
        recent_history = price_history[-24:] if len(price_history) >= 24 else price_history
        avg_volume = sum(candle.get('volume', 0) for candle in recent_history) / len(recent_history)

        if avg_volume == 0:
            return False

        volume_ratio = last_volume / avg_volume

        logger.debug(f"Volume spike check: last_volume={last_volume}, avg_volume={avg_volume}, ratio={volume_ratio:.2f}")

        return volume_ratio > 2.0

    def should_sell(self, current_price: float, entry_price: float, stop_loss_pct: float, take_profit_pct: float = None) -> bool:
        """Determine if a sell signal should be triggered.

        Args:
            current_price: Current market price
            entry_price: Price at which position was entered
            stop_loss_pct: Stop loss percentage (e.g., 5 for 5%)
            take_profit_pct: Optional take profit percentage

        Returns:
            True if sell condition is met
        """
        if entry_price <= 0:
            return False

        # Calculate price change percentage
        price_change_pct = (current_price - entry_price) / entry_price * 100

        # Check stop loss
        if price_change_pct <= -stop_loss_pct:
            logger.debug(f"Stop loss triggered: {price_change_pct:.2f}% <= -{stop_loss_pct}%")
            return True

        # Check take profit if set
        if take_profit_pct and price_change_pct >= take_profit_pct:
            logger.debug(f"Take profit triggered: {price_change_pct:.2f}% >= {take_profit_pct}%")
            return True

        return False

    def calculate_position_size(self, balance: Dict[str, Any], position_size_usd: float, current_price: float) -> float:
        """Calculate the position size in base currency.

        Args:
            balance: Account balance dictionary
            position_size_usd: Desired position size in USD
            current_price: Current price of the asset

        Returns:
            Position size in base currency units
        """
        if current_price <= 0:
            return 0.0

        # Get available USD balance
        usd_balance = balance.get('USD', balance.get('ZUSD', 0))

        # Don't exceed available balance
        available_size = min(position_size_usd, float(usd_balance))

        # Convert to base currency amount
        base_amount = available_size / current_price

        logger.debug(f"Position size calculation: USD={available_size}, price={current_price}, amount={base_amount:.6f}")

        return base_amount
