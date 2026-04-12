"""
Market data client for trading agents

Provides async functions to fetch real-time market prices from the API.
Used by agents running in the agent-runner to make trading decisions.
"""

import aiohttp
import asyncio
import json
import logging
from typing import Optional, Literal
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MarketPrice:
    """Market price response"""
    success: bool
    symbol: str
    pair: str
    price: float
    timestamp: int
    source: str
    error: Optional[str] = None


class MarketDataClient:
    """Client for fetching market prices from the API"""

    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize the market data client

        Args:
            base_url: Base URL of the Next.js API (default: http://localhost:3000)
        """
        self.base_url = base_url.rstrip("/")
        self.session: Optional[aiohttp.ClientSession] = None

    def init_session(self):
        """Initialize aiohttp session"""
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self

    async def __aenter__(self):
        """Async context manager entry"""
        self.init_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def get_price(
        self,
        symbol: str,
        pair: Optional[str] = None,
        max_retries: int = 3,
    ) -> MarketPrice:
        """
        Fetch market price for a cryptocurrency symbol

        Args:
            symbol: Cryptocurrency symbol (e.g., "ETH", "BTC")
            pair: Optional trading pair (e.g., "ETH/USD")
            max_retries: Maximum number of retry attempts

        Returns:
            MarketPrice object with price data or error
        """
        if self.session is None:
            raise Exception(
                "MarketDataClient session not initialized. "
                "Use 'async with MarketDataClient()' or call init_session()"
            )

        url = f"{self.base_url}/api/market/price"
        payload = {"symbol": symbol}
        if pair:
            payload["pair"] = pair

        for attempt in range(1, max_retries + 1):
            try:
                logger.debug(
                    f"Fetching price for {symbol} (attempt {attempt}/{max_retries})"
                )

                async with self.session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as response:
                    if response.status != 200:
                        text = await response.text()
                        raise Exception(
                            f"HTTP {response.status}: {text}"
                        )

                    data = await response.json()

                    if data.get("success"):
                        return MarketPrice(
                            success=True,
                            symbol=data.get("symbol", symbol),
                            pair=data.get("pair", f"{symbol}/USD"),
                            price=float(data.get("price", 0)),
                            timestamp=data.get("timestamp", 0),
                            source=data.get("source", "api"),
                        )
                    else:
                        raise Exception(
                            f"API error: {data.get('error', 'Unknown')}"
                        )

            except Exception as e:
                logger.warning(
                    f"Attempt {attempt} failed for {symbol}: {e}"
                )
                if attempt == max_retries:
                    return MarketPrice(
                        success=False,
                        symbol=symbol,
                        pair=pair or f"{symbol}/USD",
                        price=0.0,
                        timestamp=0,
                        source="error",
                        error=f"Failed after {max_retries} attempts: {str(e)}",
                    )
                await asyncio.sleep(1)

        return MarketPrice(
            success=False,
            symbol=symbol,
            pair=pair or f"{symbol}/USD",
            price=0.0,
            timestamp=0,
            source="error",
            error="Failed to fetch price",
        )

    async def get_prices(
        self,
        symbols: list[str],
        max_retries: int = 3,
    ) -> dict[str, MarketPrice]:
        """
        Fetch prices for multiple symbols concurrently

        Args:
            symbols: List of symbols to fetch
            max_retries: Maximum retry attempts per symbol

        Returns:
            Dictionary mapping symbol to MarketPrice
        """
        tasks = [
            self.get_price(symbol, max_retries=max_retries)
            for symbol in symbols
        ]
        results = await asyncio.gather(*tasks)
        return {result.symbol: result for result in results}


# Convenience function for quick price fetches
async def get_market_price(
    symbol: str,
    base_url: str = "http://localhost:3000",
) -> MarketPrice:
    """
    Quick helper to fetch a single price without managing session

    Args:
        symbol: Cryptocurrency symbol
        base_url: API base URL

    Returns:
        MarketPrice with price data or error
    """
    async with MarketDataClient(base_url) as client:
        return await client.get_price(symbol)


# Example usage
async def example():
    """Example of how to use the market data client"""
    async with MarketDataClient("http://localhost:3000") as client:
        # Fetch single price
        eth_price = await client.get_price("ETH")
        if eth_price.success:
            print(f"ETH Price: ${eth_price.price}")
        else:
            print(f"Error: {eth_price.error}")

        # Fetch multiple prices
        prices = await client.get_prices(["BTC", "ETH", "SOL"])
        for symbol, price in prices.items():
            if price.success:
                print(f"{symbol}: ${price.price}")


if __name__ == "__main__":
    asyncio.run(example())
