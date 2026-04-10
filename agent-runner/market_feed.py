"""Real-time market feed support using Kraken public WebSocket API."""
import asyncio
import json
import logging
from typing import Any, Dict, Optional

import aiohttp

logger = logging.getLogger("ice_cream_runner")


class RealTimeMarketFeed:
    """A lightweight Kraken WebSocket feed for ticker updates."""

    def __init__(self, pair: str, ws_url: str = "wss://ws.kraken.com"):
        self.original_pair = pair
        self.pair = self._normalize_pair(pair)
        self.ws_url = ws_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self.latest_ticker: Dict[str, Any] = {}
        self.connected = False

    async def connect(self) -> None:
        """Open the websocket connection and subscribe to ticker updates."""
        if self.connected:
            return

        self.session = aiohttp.ClientSession()
        self.ws = await self.session.ws_connect(self.ws_url)

        subscribe_message = {
            "event": "subscribe",
            "pair": [self.pair],
            "subscription": {"name": "ticker"}
        }

        await self.ws.send_json(subscribe_message)

        # Wait for subscription acknowledgement
        try:
            msg = await asyncio.wait_for(self.ws.receive(), timeout=5)
            if msg.type == aiohttp.WSMsgType.TEXT:
                payload = json.loads(msg.data)
                if isinstance(payload, dict) and payload.get("event") == "subscriptionStatus":
                    if payload.get("status") != "subscribed":
                        raise RuntimeError(f"Subscription failed: {payload}")
            self.connected = True
            logger.info(f"✅ Connected to Kraken websocket feed for {self.original_pair}")
        except asyncio.TimeoutError:
            raise RuntimeError("Timeout while subscribing to Kraken websocket feed")

    async def disconnect(self) -> None:
        """Close the websocket connection."""
        self.connected = False
        if self.ws is not None and not self.ws.closed:
            await self.ws.close()
        if self.session is not None and not self.session.closed:
            await self.session.close()

    async def get_latest_ticker(self, timeout: float = 0.5) -> Optional[Dict[str, Any]]:
        """Receive the latest ticker update from the websocket feed."""
        if not self.connected:
            try:
                await self.connect()
            except Exception as exc:
                logger.warning(f"Realtime feed connect failed: {exc}")
                return None

        try:
            msg = await asyncio.wait_for(self.ws.receive(), timeout=timeout)
        except (asyncio.TimeoutError, AttributeError):
            return self.latest_ticker if self.latest_ticker else None

        if msg.type != aiohttp.WSMsgType.TEXT:
            return self.latest_ticker if self.latest_ticker else None

        try:
            data = json.loads(msg.data)
        except json.JSONDecodeError:
            return self.latest_ticker if self.latest_ticker else None

        # Kraken ticker messages are list-based: [channelID, data, pair]
        if isinstance(data, list) and len(data) >= 3 and isinstance(data[1], dict):
            self._process_ticker_message(data[1])
            return self.latest_ticker

        return self.latest_ticker if self.latest_ticker else None

    def _process_ticker_message(self, payload: Dict[str, Any]) -> None:
        """Normalize Kraken ticker payload into a consistent ticker dictionary."""
        try:
            self.latest_ticker = {
                'last': float(payload.get('c', [0])[0]),
                'ask': [float(payload.get('a', [0, 0, 0])[0]), float(payload.get('a', [0, 0, 0])[2])],
                'bid': [float(payload.get('b', [0, 0, 0])[0]), float(payload.get('b', [0, 0, 0])[2])],
                'volume': [float(payload.get('v', [0, 0])[0]), float(payload.get('v', [0, 0])[1])],
                'open': float(payload.get('o', [0])[0]),
                'high': float(payload.get('h', [0])[0]),
                'low': float(payload.get('l', [0])[0]),
                'pair': self.original_pair,
                'raw': payload,
            }
        except (TypeError, ValueError):
            logger.debug("Failed to normalize realtime ticker payload")

    def _normalize_pair(self, pair: str) -> str:
        """Normalize common pair names for Kraken WebSocket subscription."""
        base, quote = pair.split('/')
        mapping = {
            'BTC': 'XBT',
            'ETH': 'ETH',
            'SOL': 'SOL',
            'BNB': 'BNB',
            'USDT': 'USDT',
            'USD': 'USD'
        }
        kraken_base = mapping.get(base, base)
        kraken_quote = mapping.get(quote, quote)
        return f"{kraken_base}/{kraken_quote}"
