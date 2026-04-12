// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Types
 * @notice Shared types and enums for IceCream trading agents
 */
library Types {
    enum StrategyType { SPOT, DCA, SNIPER, MARGIN, MEME, ARBITRAGE, VISUAL }
    enum AgentStatus { PENDING, ACTIVE, PAUSED, STOPPED, ERROR }
    enum TradeDirection { BUY, SELL, HOLD }
}
