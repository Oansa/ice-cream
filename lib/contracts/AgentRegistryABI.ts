/**
 * AgentRegistry Contract ABI
 * Deployed on Sepolia for managing AI trading agents
 */

export const AgentRegistryABI = [
  // Constructor
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },

  // Events
  {
    type: "event",
    name: "AgentDeployed",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "agentContract", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "strategyType", type: "uint8" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "AgentStatusChanged",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "isActive", type: "bool" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DeploymentFeeUpdated",
    inputs: [{ indexed: false, name: "newFee", type: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "MaxAgentsPerUserUpdated",
    inputs: [{ indexed: false, name: "newMax", type: "uint256" }],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { indexed: true, name: "previousOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
    anonymous: false,
  },

  // Read Functions
  {
    type: "function",
    name: "agentContracts",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agentMetadata",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "strategyType", type: "uint8" },
      { name: "tokenPair", type: "string" },
      { name: "trigger", type: "string" },
      { name: "positionSize", type: "uint256" },
      { name: "stopLossPct", type: "uint256" },
      { name: "isActive", type: "bool" },
      { name: "createdAt", type: "uint256" },
      { name: "agentContract", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "deploymentFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentInfo",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "strategyType", type: "uint8" },
          { name: "tokenPair", type: "string" },
          { name: "trigger", type: "string" },
          { name: "positionSize", type: "uint256" },
          { name: "stopLossPct", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "createdAt", type: "uint256" },
          { name: "agentContract", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserAgents",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "tokenIds", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maxAgentsPerUser",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userAgents",
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },

  // Write Functions
  {
    type: "function",
    name: "deployAgent",
    inputs: [
      { name: "name", type: "string" },
      { name: "strategyType", type: "uint8" },
      { name: "tokenPair", type: "string" },
      { name: "trigger", type: "string" },
      { name: "positionSize", type: "uint256" },
      { name: "stopLossPct", type: "uint256" },
      { name: "strategyGraphJSON", type: "string" },
    ],
    outputs: [
      { name: "tokenId", type: "uint256" },
      { name: "agentContract", type: "address" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "safeTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setApprovalForAll",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setDeploymentFee",
    inputs: [{ name: "newFee", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMaxAgentsPerUser",
    inputs: [{ name: "newMax", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "toggleAgentStatus",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawFees",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Strategy type enum mapping
export enum StrategyType {
  SPOT = 0,
  DCA = 1,
  SNIPER = 2,
  MARGIN = 3,
  MEME = 4,
  ARBITRAGE = 5,
  VISUAL = 6,
}

export const StrategyTypeNames: Record<StrategyType, string> = {
  [StrategyType.SPOT]: "SPOT",
  [StrategyType.DCA]: "DCA",
  [StrategyType.SNIPER]: "SNIPER",
  [StrategyType.MARGIN]: "MARGIN",
  [StrategyType.MEME]: "MEME",
  [StrategyType.ARBITRAGE]: "ARBITRAGE",
  [StrategyType.VISUAL]: "VISUAL",
};

// Agent metadata type
export interface AgentMetadata {
  name: string;
  strategyType: number;
  tokenPair: string;
  trigger: string;
  positionSize: bigint;
  stopLossPct: bigint;
  isActive: boolean;
  createdAt: bigint;
  agentContract: string;
}

// Deployed agent type
export interface OnChainAgent {
  tokenId: string;
  owner: string;
  agentContract: string;
  metadata: AgentMetadata;
  tokenURI: string;
}
