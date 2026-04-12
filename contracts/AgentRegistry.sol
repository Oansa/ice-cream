// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Types.sol";
import "./TradingAgent.sol";

/**
 * @title AgentRegistry
 * @notice Factory and registry for AI trading agents on Sepolia
 * @dev Each agent is minted as an ERC721 NFT
 */
contract AgentRegistry is ERC721Enumerable, Ownable {
    using Types for *;

    uint256 private _tokenIds;

    // Platform fee for deploying agents (in wei)
    uint256 public deploymentFee = 0.001 ether;

    // Maximum number of agents per user
    uint256 public maxAgentsPerUser = 10;

    // Mapping from token ID to agent contract address
    mapping(uint256 => address) public agentContracts;

    // Mapping from user address to their agent token IDs
    mapping(address => uint256[]) public userAgents;

    // Mapping from token ID to agent metadata
    mapping(uint256 => AgentMetadata) public agentMetadata;

    struct AgentMetadata {
        string name;
        Types.StrategyType strategyType;
        string tokenPair;
        string trigger;
        uint256 positionSize;
        uint256 stopLossPct;
        bool isActive;
        uint256 createdAt;
        address agentContract;
    }

    // Events
    event AgentDeployed(
        uint256 indexed tokenId,
        address indexed owner,
        address agentContract,
        string name,
        Types.StrategyType strategyType,
        uint256 timestamp
    );

    event AgentStatusChanged(uint256 indexed tokenId, bool isActive);
    event DeploymentFeeUpdated(uint256 newFee);
    event MaxAgentsPerUserUpdated(uint256 newMax);

    constructor() ERC721("IceCream Trading Agent", "ICECREAM") Ownable(msg.sender) {}

    /**
     * @notice Deploy a new trading agent
     * @param name Agent name
     * @param strategyType Strategy type (0-6)
     * @param tokenPair Trading pair (e.g., "ETH/USD")
     * @param trigger Trigger condition
     * @param positionSize Position size in wei
     * @param stopLossPct Stop loss percentage
     * @param strategyGraphJSON Optional strategy graph as JSON string
     * @return tokenId The ID of the minted NFT
     * @return agentContract The address of the deployed agent contract
     */
    function deployAgent(
        string calldata name,
        Types.StrategyType strategyType,
        string calldata tokenPair,
        string calldata trigger,
        uint256 positionSize,
        uint256 stopLossPct,
        string calldata strategyGraphJSON
    ) external payable returns (uint256 tokenId, address agentContract) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(bytes(name).length > 0, "Name required");
        require(bytes(tokenPair).length > 0, "Token pair required");
        require(userAgents[msg.sender].length < maxAgentsPerUser, "Max agents reached");

        _tokenIds++;
        tokenId = _tokenIds;

        // Deploy the agent contract
        agentContract = address(new TradingAgent(
            tokenId,
            msg.sender,
            name,
            strategyType,
            tokenPair,
            trigger,
            positionSize,
            stopLossPct,
            strategyGraphJSON
        ));

        // Mint NFT to user
        _safeMint(msg.sender, tokenId);

        // Store metadata
        agentMetadata[tokenId] = AgentMetadata({
            name: name,
            strategyType: strategyType,
            tokenPair: tokenPair,
            trigger: trigger,
            positionSize: positionSize,
            stopLossPct: stopLossPct,
            isActive: true,
            createdAt: block.timestamp,
            agentContract: agentContract
        });

        agentContracts[tokenId] = agentContract;
        userAgents[msg.sender].push(tokenId);

        // Generate token URI with metadata
        string memory metadataURI = _generateTokenURI(tokenId, name, strategyType, tokenPair);

        emit AgentDeployed(
            tokenId,
            msg.sender,
            agentContract,
            name,
            strategyType,
            block.timestamp
        );

        return (tokenId, agentContract);
    }

    /**
     * @notice Toggle agent active status
     * @param tokenId The agent token ID
     */
    function toggleAgentStatus(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");

        AgentMetadata storage metadata = agentMetadata[tokenId];
        metadata.isActive = !metadata.isActive;

        // Update the agent contract
        TradingAgent(payable(metadata.agentContract)).toggleActive();

        emit AgentStatusChanged(tokenId, metadata.isActive);
    }

    /**
     * @notice Get all agents for a user
     * @param user User address
     * @return tokenIds Array of agent token IDs
     */
    function getUserAgents(address user) external view returns (uint256[] memory) {
        return userAgents[user];
    }

    /**
     * @notice Get detailed info for an agent
     * @param tokenId Agent token ID
     * @return metadata Agent metadata
     */
    function getAgentInfo(uint256 tokenId) external view returns (AgentMetadata memory) {
        require(_exists(tokenId), "Agent does not exist");
        return agentMetadata[tokenId];
    }

    /**
     * @notice Update deployment fee (owner only)
     * @param newFee New fee in wei
     */
    function setDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }

    /**
     * @notice Update max agents per user (owner only)
     * @param newMax New maximum
     */
    function setMaxAgentsPerUser(uint256 newMax) external onlyOwner {
        maxAgentsPerUser = newMax;
        emit MaxAgentsPerUserUpdated(newMax);
    }

    /**
     * @notice Withdraw collected fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @notice Generate token URI with metadata
     */
    function _generateTokenURI(
        uint256 tokenId,
        string memory name,
        Types.StrategyType strategyType,
        string memory tokenPair
    ) internal pure returns (string memory) {
        // Create JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name":"', name, '",',
            '"description":"IceCream Trading Agent #', _toString(tokenId), '",',
            '"image":"', _generatePlaceholderImage(strategyType), '",',
            '"attributes":[',
            '{"trait_type":"Strategy","value":"', _strategyToString(strategyType), '"},',
            '{"trait_type":"Token Pair","value":"', tokenPair, '"},',
            '{"trait_type":"Token ID","display_type":"number","value":', _toString(tokenId), '}',
            ']}'
        ));

        // Base64 encode
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeBase64(bytes(json))
        ));
    }

    function _generatePlaceholderImage(Types.StrategyType strategyType) internal pure returns (string memory) {
        // Return a data URI for a simple SVG placeholder
        string memory color = _strategyColor(strategyType);
        return string(abi.encodePacked(
            "data:image/svg+xml;base64,",
            _encodeBase64(bytes(abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">',
                '<rect width="500" height="500" fill="', color, '"/>',
                '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="40">',
                _strategyToString(strategyType), '</text></svg>'
            )))
        ));
    }

    function _strategyToString(Types.StrategyType strategyType) internal pure returns (string memory) {
        if (strategyType == Types.StrategyType.SPOT) return "SPOT";
        if (strategyType == Types.StrategyType.DCA) return "DCA";
        if (strategyType == Types.StrategyType.SNIPER) return "SNIPER";
        if (strategyType == Types.StrategyType.MARGIN) return "MARGIN";
        if (strategyType == Types.StrategyType.MEME) return "MEME";
        if (strategyType == Types.StrategyType.ARBITRAGE) return "ARBITRAGE";
        if (strategyType == Types.StrategyType.VISUAL) return "VISUAL";
        return "UNKNOWN";
    }

    function _strategyColor(Types.StrategyType strategyType) internal pure returns (string memory) {
        if (strategyType == Types.StrategyType.SPOT) return "#6366f1";
        if (strategyType == Types.StrategyType.DCA) return "#10b981";
        if (strategyType == Types.StrategyType.SNIPER) return "#ef4444";
        if (strategyType == Types.StrategyType.MARGIN) return "#f59e0b";
        if (strategyType == Types.StrategyType.MEME) return "#ec4899";
        if (strategyType == Types.StrategyType.ARBITRAGE) return "#8b5cf6";
        if (strategyType == Types.StrategyType.VISUAL) return "#3b82f6";
        return "#6b7280";
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _encodeBase64(bytes memory data) internal pure returns (string memory) {
        string memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 i;
        if (data.length == 0) return "";

        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen + 32);

        bytes memory table = bytes(TABLE);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)

            for {
                let endPtr := add(data, mload(data))
            } lt(data, endPtr) {
                data := add(data, 3)
            } {
                i := mload(data)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, i), 0x3F))))
                mstore8(add(resultPtr, 1), mload(add(tablePtr, and(shr(12, i), 0x3F))))
                mstore8(add(resultPtr, 2), mload(add(tablePtr, and(shr(6, i), 0x3F))))
                mstore8(add(resultPtr, 3), mload(add(tablePtr, and(i, 0x3F))))
                resultPtr := add(resultPtr, 4)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 2), 0x3d)
                mstore8(sub(resultPtr, 1), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return string(result);
    }

    // Required overrides


    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
