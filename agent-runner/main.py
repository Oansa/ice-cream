"""Entry point for the Ice Cream Agent Runner."""
import asyncio
import signal
import sys

from runner import AgentRunner


async def main():
    """Main entry point - sets up and runs the agent runner."""
    print("🍦 Ice Cream Agent Runner starting...")
    print("   _ _ _       _              ____                             ")
    print(r"  (_) (_) __ _| | ___ __ ___ |  _ \ __ _ _ __  _ __   ___ _ __  ")
    print(r"  | | | |/ _` | |/ / '__/ _ \| |_) / _` | '_ \| '_ \ / _ \ '__| ")
    print(r"  | | | | (_| |   <| | | (_) |  _ < (_| | |_) | |_) |  __/ |    ")
    print(r" _/ |_|_|\__,_|_|\_\_|  \___/|_| \_\__,_| .__/| .__/ \___|_|    ")
    print("|__/                                    |_|   |_|               ")
    print()

    runner = AgentRunner()

    # Handle graceful shutdown
    def handle_signal(signum, frame):
        print(f"\n📡 Received signal {signum}, initiating shutdown...")
        # Cancel the main task
        for task in asyncio.all_tasks():
            if task is not asyncio.current_task():
                task.cancel()

    # Register signal handlers
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        await runner.start()
        await runner.run_all()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down gracefully...")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
    finally:
        await runner.stop()
        print("👋 Goodbye!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        sys.exit(0)
