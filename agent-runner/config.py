"""Configuration module - loads all settings from environment variables."""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Kraken API credentials
KRAKEN_API_KEY = os.getenv("KRAKEN_API_KEY")
KRAKEN_API_SECRET = os.getenv("KRAKEN_API_SECRET")

# Supabase configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Runner settings
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "30"))  # seconds between checks
PAPER_TRADING = os.getenv("PAPER_TRADING", "false").lower() == "true"  # Set to false for live trading
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
KRAKEN_CLI_PATH = os.getenv("KRAKEN_CLI_PATH", "kraken")
USE_REALTIME_FEED = os.getenv("USE_REALTIME_FEED", "false").lower() == "true"
REALTIME_FEED_URL = os.getenv("REALTIME_FEED_URL", "wss://ws.kraken.com")

# Blockchain settings for live trading
BLOCKCHAIN_RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "http://localhost:8545")  # local Sepolia RPC or Alchemy
TRADING_AGENT_CONTRACT = os.getenv("TRADING_AGENT_CONTRACT", "")  # Deployed contract address on Sepolia
BLOCKCHAIN_ENABLED = os.getenv("BLOCKCHAIN_ENABLED", "true").lower() == "true"  # Use blockchain for trading

# Validate required environment variables
def validate_config():
    """Validate that all required configuration is present."""
    required = [
        ("KRAKEN_API_KEY", KRAKEN_API_KEY),
        ("KRAKEN_API_SECRET", KRAKEN_API_SECRET),
        ("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL),
        ("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_KEY),
    ]

    missing = [name for name, value in required if not value]

    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    return True
