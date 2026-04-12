// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Types.sol";

/**
 * @title TradingAgent
 * @notice Individual AI trading agent contract
 * @dev Stores agent configuration and execution state
 */
contract TradingAgent is Ownable, ReentrancyGuard {
    // Agent configuration
    uint256 public immutable tokenId;
    string public name;
    Types.StrategyType public strategyType;
    string public tokenPair;
    string public trigger;
    uint256 public positionSize;
    uint256 public stopLossPct;
    string public strategyGraphJSON;

    // Agent state
    bool public isActive;
    Types.AgentStatus public status;
    uint256 public createdAt;
    uint256 public lastTradeAt;
    uint256 public totalTrades;
    uint256 public totalPnL;

    // Using shared types from Types.sol
    // Types.StrategyType, Types.AgentStatus, Types.TradeDirection

    // Trade structure
    struct Trade {
        uint256 id;
        Types.TradeDirection direction;
        uint256 amount;
        uint256 price;
        uint256 timestamp;
        string txHash;
        bool executed;
    }

    // Position structure
    struct Position {
        uint256 entryPrice;
        uint256 amount;
        uint256 entryTimestamp;
        bool isOpen;
    }

    // Storage
    Trade[] public trades;
    Position public currentPosition;

    // Authorized executors (off-chain bot wallets)
    mapping(address => bool) public authorizedExecutors;

    // Events
    event TradeExecuted(
        uint256 indexed tradeId,
        Types.TradeDirection direction,
        uint256 amount,
        uint256 price,
        uint256 timestamp,
        string txHash
    );

    event StatusChanged(Types.AgentStatus newStatus);
    event ExecutorAuthorized(address executor);
    event ExecutorRevoked(address executor);
    event FundsDeposited(address sender, uint256 amount);
    event FundsWithdrawn(address recipient, uint256 amount);

    modifier onlyExecutor() {
        require(
            authorizedExecutors[msg.sender] || msg.sender == owner(),
            "Not authorized executor"
        );
        _;
    }

    modifier onlyActive() {
        require(isActive, "Agent not active");
        _;
    }

    constructor(
        uint256 _tokenId,
        address _owner,
        string memory _name,
        Types.StrategyType _strategyType,
        string memory _tokenPair,
        string memory _trigger,
        uint256 _positionSize,
        uint256 _stopLossPct,
        string memory _strategyGraphJSON
    ) Ownable(_owner) {
        tokenId = _tokenId;
        name = _name;
        strategyType = _strategyType;
        tokenPair = _tokenPair;
        trigger = _trigger;
        positionSize = _positionSize;
        stopLossPct = _stopLossPct;
        strategyGraphJSON = _strategyGraphJSON;

        isActive = true;
        status = Types.AgentStatus.ACTIVE;
        createdAt = block.timestamp;
        totalTrades = 0;
        totalPnL = 0;

        // Initialize empty position
        currentPosition = Position({
            entryPrice: 0,
            amount: 0,
            entryTimestamp: 0,
            isOpen: false
        });
    }

    /**
     * @notice Authorize an address to execute trades on behalf of this agent
     * @param executor Address to authorize
     */
    function authorizeExecutor(address executor) external onlyOwner {
        require(executor != address(0), "Invalid executor address");
        authorizedExecutors[executor] = true;
        emit ExecutorAuthorized(executor);
    }

    /**
     * @notice Revoke executor authorization
     * @param executor Address to revoke
     */
    function revokeExecutor(address executor) external onlyOwner {
        authorizedExecutors[executor] = false;
        emit ExecutorRevoked(executor);
    }

    /**
     * @notice Toggle agent active status
     */
    function toggleActive() external onlyOwner {
        isActive = !isActive;
        status = isActive ? Types.AgentStatus.ACTIVE : Types.AgentStatus.PAUSED;
        emit StatusChanged(status);
    }

    /**
     * @notice Execute a trade (called by authorized executor)
     * @param direction Trade direction (BUY, SELL, HOLD)
     * @param amount Trade amount
     * @param price Current price
     * @param txHash Off-chain transaction hash
     */
    function executeTrade(
        Types.TradeDirection direction,
        uint256 amount,
        uint256 price,
        string calldata txHash
    ) external onlyExecutor onlyActive nonReentrant returns (uint256 tradeId) {
        require(direction != Types.TradeDirection.HOLD || amount == 0, "HOLD should have 0 amount");

        tradeId = trades.length;

        Trade memory newTrade = Trade({
            id: tradeId,
            direction: direction,
            amount: amount,
            price: price,
            timestamp: block.timestamp,
            txHash: txHash,
            executed: true
        });

        trades.push(newTrade);

        // Update position
        if (direction == Types.TradeDirection.BUY) {
            require(!currentPosition.isOpen, "Position already open");
            currentPosition = Position({
                entryPrice: price,
                amount: amount,
                entryTimestamp: block.timestamp,
                isOpen: true
            });
        } else if (direction == Types.TradeDirection.SELL) {
            require(currentPosition.isOpen, "No position to close");

            // Calculate PnL
            if (currentPosition.entryPrice > 0) {
                int256 priceDiff = int256(price) - int256(currentPosition.entryPrice);
                int256 pnl = (priceDiff * int256(currentPosition.amount)) / int256(currentPosition.entryPrice);
                if (pnl > 0) {
                    totalPnL += uint256(pnl);
                }
            }

            currentPosition.isOpen = false;
            currentPosition.amount = 0;
        }

        totalTrades++;
        lastTradeAt = block.timestamp;

        emit TradeExecuted(tradeId, direction, amount, price, block.timestamp, txHash);

        return tradeId;
    }

    /**
     * @notice Check if stop loss should be triggered
     * @param currentPrice Current market price
     * @return shouldTrigger Whether stop loss should trigger
     */
    function checkStopLoss(uint256 currentPrice) external view returns (bool shouldTrigger) {
        if (!currentPosition.isOpen || currentPosition.entryPrice == 0) {
            return false;
        }

        uint256 entryPrice = currentPosition.entryPrice;
        uint256 lossPct = ((entryPrice - currentPrice) * 100) / entryPrice;

        return lossPct >= stopLossPct;
    }

    /**
     * @notice Get all trades for this agent
     * @return Array of trades
     */
    function getAllTrades() external view returns (Trade[] memory) {
        return trades;
    }

    /**
     * @notice Get trade count
     * @return Number of trades
     */
    function getTradeCount() external view returns (uint256) {
        return trades.length;
    }

    /**
     * @notice Get paginated trades
     * @param offset Start index
     * @param limit Max number of trades
     * @return Array of trades
     */
    function getTradesPaginated(uint256 offset, uint256 limit) external view returns (Trade[] memory) {
        uint256 end = offset + limit;
        if (end > trades.length) {
            end = trades.length;
        }
        if (offset >= trades.length) {
            return new Trade[](0);
        }

        uint256 count = end - offset;
        Trade[] memory result = new Trade[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = trades[offset + i];
        }
        return result;
    }

    /**
     * @notice Get current position info
     * @return position Current position details
     */
    function getPositionInfo() external view returns (Position memory position) {
        return currentPosition;
    }

    /**
     * @notice Get agent summary
     */
    function getSummary() external view returns (
        string memory _name,
        Types.StrategyType _strategy,
        string memory _pair,
        bool _isActive,
        Types.AgentStatus _status,
        uint256 _totalTrades,
        uint256 _totalPnL,
        uint256 _lastTradeAt,
        bool _hasPosition
    ) {
        return (
            name,
            strategyType,
            tokenPair,
            isActive,
            status,
            totalTrades,
            totalPnL,
            lastTradeAt,
            currentPosition.isOpen
        );
    }

    /**
     * @notice Deposit funds to the agent contract
     */
    function deposit() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw funds (owner only)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner()).transfer(amount);
        emit FundsWithdrawn(owner(), amount);
    }

    /**
     * @notice Get contract balance
     * @return Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Update strategy graph (owner only)
     * @param newGraphJSON New strategy graph JSON
     */
    function updateStrategyGraph(string calldata newGraphJSON) external onlyOwner {
        strategyGraphJSON = newGraphJSON;
    }

    /**
     * @notice Emergency stop (owner only)
     */
    function emergencyStop() external onlyOwner {
        isActive = false;
        status = Types.AgentStatus.STOPPED;
        emit StatusChanged(status);
    }

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
