"""
Kraken market data for agents: HTTP ONLY.

The Kraken CLI runs inside WSL and is not callable from Windows/Python directly.
All prices go through the Node bridge:

  POST http://localhost:4000/
  {"command": "price", "args": "<TOKEN_SYMBOL>"}  e.g. "BTC"

Response: {"success": true, "output": "<raw CLI output>"}

Configure base URL with env KRAKEN_HTTP_BASE_URL (default http://localhost:4000).
"""
import os
import aiohttp
import asyncio
import json
import logging
import re
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Returned after 3 failed HTTP attempts — never fabricate prices.
DATA_UNAVAILABLE = "DATA_UNAVAILABLE"


def token_pair_to_price_symbol(token_pair: str) -> str:
    """
    Map agent pair (e.g. BTC/USDT, ETH/USD) to the token symbol expected by the
    Node bridge: POST {"command":"price","args":"<TOKEN_SYMBOL>"} (e.g. BTC).
    """
    raw = (token_pair or "").strip().upper()
    if not raw:
        return "BTC"
    base = raw.split("/")[0].strip() if "/" in raw else raw
    aliases = {
        "XBT": "BTC",
        "XXBT": "BTC",
        "XETH": "ETH",
        "XXETH": "ETH",
        "SOL": "SOL",
        "XSOL": "SOL",
    }
    return aliases.get(base, base)


@dataclass
class PriceResult:
    success: bool
    price: float = 0.0
    raw_output: str = ""
    error: Optional[str] = None

class KrakenHTTP:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or os.getenv("KRAKEN_HTTP_BASE_URL", "http://localhost:4000")).rstrip("/")
        self.session: Optional[aiohttp.ClientSession] = None

    def init_session(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self

    async def __aenter__(self):
        self.init_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def get_price(self, symbol: str, max_retries: int = 3) -> PriceResult:
        """
        Fetch price via POST to the service root (e.g. http://localhost:4000/).
        Retry up to max_retries on failure.
        Parse numeric price from CLI output.
        """
        if self.session is None:
            raise Exception("KrakenHTTP session not initialized. Use 'async with KrakenHTTP()' or call __aenter__")

        url = f"{self.base_url}/"

        for attempt in range(1, max_retries + 1):
            try:
                payload = {
                    "command": "price",
                    "args": symbol
                }
                logger.info(f"Fetching price for {symbol} (attempt {attempt}/{max_retries})")

                async with self.session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}: {await response.text()}")

                    data = await response.json()

                    if not data.get("success"):
                        raise Exception(f"API error: {data.get('output', 'Unknown')}")

                    raw_output = data.get("output", "")
                    price = self._extract_price(raw_output)

                    if price > 0:
                        logger.debug(f"Price for {symbol}: {price} from '{raw_output}'")
                        return PriceResult(success=True, price=price, raw_output=raw_output)
                    else:
                        raise Exception(f"Invalid price '{raw_output}'")

            except Exception as e:
                logger.warning(f"Attempt {attempt} failed for {symbol}: {e}")
                if attempt == max_retries:
                    return PriceResult(
                        success=False,
                        price=0.0,
                        raw_output="",
                        error=DATA_UNAVAILABLE,
                    )
                await asyncio.sleep(1)

        return PriceResult(success=False, price=0.0, raw_output="", error=DATA_UNAVAILABLE)

    def _extract_price(self, output: str) -> float:
        """
        Parse numeric price from raw CLI output. Handle various formats.
        """
        if not output:
            return 0.0

        # Try JSON parse first
        try:
            data = json.loads(output)
            # Common Kraken JSON fields
            for key in ['last', 'c', 'price', 'ask', 'l', 'c']:
                if isinstance(data, dict) and key in data:
                    val = data[key]
                    if isinstance(val, (int, float)):
                        return float(val)
                    if isinstance(val, list) and val:
                        return float(val[0])
            # Nested pair data
            for v in data.values():
                if isinstance(v, dict):
                    for key in ['last', 'c']:
                        if key in v:
                            val = v[key]
                            return float(val[0]) if isinstance(val, list) else float(val)
        except json.JSONDecodeError:
            pass

        # Fallback: regex floats in text
        floats = re.findall(r"\d+\.?\d*(?:[eE][+-]?\d+)?", output)
        for f in floats[-5:]:
            try:
                price = float(f)
                if 0 < price < 1e12:
                    return price
            except ValueError:
                pass

        return 0.0


# Test usage
async def test():
    async with KrakenHTTP() as client:
        result = await client.get_price("BTC")
        print(result)

if __name__ == "__main__":
    asyncio.run(test())

