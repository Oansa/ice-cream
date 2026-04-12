"""Kraken CLI wrapper for executing trades and fetching market data."""
import subprocess
import json
import logging
from typing import Dict, List, Optional, Any

from config import KRAKEN_CLI_PATH, PAPER_TRADING

logger = logging.getLogger("ice_cream_runner")


class KrakenCLIError(Exception):
    """Exception raised when Kraken CLI returns an error."""

    def __init__(self, message: str, command: str = None, stderr: str = None):
        self.message = message
        self.command = command
        self.stderr = stderr
        super().__init__(self.message)


class KrakenCLI:
    """Wrapper around the Kraken CLI binary."""

    def __init__(self, cli_path: str = None):
        self.cli_path = cli_path or KRAKEN_CLI_PATH

    def _run_command(self, command_args: List[str]) -> Dict[str, Any]:
        """Execute a kraken CLI command and parse JSON output."""
        full_command = [self.cli_path] + command_args + ["--output", "json"]

        try:
            logger.debug(f"Executing Kraken command: {' '.join(full_command)}")

            result = subprocess.run(
                full_command,
                capture_output=True,
                text=True,
                check=False
            )

            # Check for command errors
            if result.returncode != 0:
                error_msg = f"Kraken CLI error (exit {result.returncode})"
                if result.stderr:
                    error_msg += f": {result.stderr.strip()}"
                logger.error(error_msg)
                raise KrakenCLIError(error_msg, command=' '.join(full_command), stderr=result.stderr)

            # Parse JSON output
            if not result.stdout.strip():
                return {}

            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError as e:
                error_msg = f"Failed to parse Kraken CLI output as JSON: {e}"
                logger.error(error_msg)
                raise KrakenCLIError(error_msg, command=' '.join(full_command))

        except subprocess.SubprocessError as e:
            error_msg = f"Failed to execute Kraken CLI command: {e}"
            logger.error(error_msg)
            raise KrakenCLIError(error_msg, command=' '.join(full_command))

    def validate_connection(self) -> bool:
        """Validate Kraken connection is online and authenticated."""
        # In paper trading mode, skip CLI validation
        if PAPER_TRADING:
            logger.info("📄 Paper trading mode - skipping CLI validation")
            return True

        try:
            result = self._run_command(["status"])
            # Check if system is online
            if result.get("status") == "online" or result.get("online") == True:
                logger.info("Kraken connection validated successfully")
                return True
            return False
        except KrakenCLIError as e:
            logger.error(f"Kraken connection validation failed: {e.message}")
            return False

    def get_balance(self) -> Dict[str, Any]:
        """Get account balances."""
        return self._run_command(["balance"])

    def get_ticker(self, pair: str) -> Dict[str, Any]:
        """Get current ticker data for a trading pair.

        Returns price data including bid, ask, last price, 24h volume, 24h high, 24h low.
        """
        return self._run_command(["ticker", "--pair", pair])

    def get_ohlc(self, pair: str, interval: int = 1) -> List[Dict[str, Any]]:
        """Get OHLC candle data for strategy analysis."""
        result = self._run_command(["ohlc", "--pair", pair, "--interval", str(interval)])
        # Result might be a dict with 'data' key or a list directly
        if isinstance(result, dict) and "data" in result:
            return result["data"]
        return result if isinstance(result, list) else []

    def get_orderbook(self, pair: str) -> Dict[str, Any]:
        """Get orderbook for a trading pair."""
        return self._run_command(["orderbook", "--pair", pair])

    def place_order(
        self,
        pair: str,
        direction: str,
        volume: str,
        order_type: str = "market",
        paper: bool = True
    ) -> Dict[str, Any]:
        """Place an order on Kraken.

        Args:
            pair: Trading pair (e.g., ETH/USD)
            direction: 'buy' or 'sell'
            volume: Order volume as string
            order_type: Order type (default: market)
            paper: If True, use paper trading

        Returns:
            Order confirmation with order ID
        """
        cmd = ["order", "new"] if not paper else ["paper", "order", "new"]

        args = cmd + [
            "--pair", pair,
            "--type", direction.lower(),
            "--volume", volume,
            "--ordertype", order_type
        ]

        return self._run_command(args)

    def get_open_orders(self) -> List[Dict[str, Any]]:
        """Get list of open orders."""
        result = self._run_command(["open-orders"])
        if isinstance(result, dict) and "open" in result:
            return result["open"]
        return result if isinstance(result, list) else []

    def get_closed_orders(self) -> List[Dict[str, Any]]:
        """Get list of closed orders."""
        result = self._run_command(["closed-orders"])
        if isinstance(result, dict) and "closed" in result:
            return result["closed"]
        return result if isinstance(result, list) else []

    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancel a specific open order."""
        return self._run_command(["order", "cancel", "--order-id", order_id])

    def get_trade_history(self) -> List[Dict[str, Any]]:
        """Get trade history."""
        result = self._run_command(["trades-history"])
        if isinstance(result, dict) and "trades" in result:
            return result["trades"]
        return result if isinstance(result, list) else []
