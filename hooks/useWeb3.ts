/**
 * Web3 hooks for connecting to Sepolia and deploying agents
 * Uses ethers.js v6
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, Contract, JsonRpcSigner, ethers } from "ethers";
import {
  AgentRegistryABI,
  StrategyType,
  AgentMetadata,
  OnChainAgent,
  StrategyTypeNames,
} from "@/lib/contracts/AgentRegistryABI";

// Re-export types for convenience
export type { OnChainAgent };
export { StrategyType, StrategyTypeNames };

// Contract address - loaded from environment
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_AGENT_REGISTRY || "";

// Sepolia network config
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

interface Web3State {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface AgentDeployParams {
  name: string;
  strategyType: StrategyType;
  tokenPair: string;
  trigger: string;
  positionSize: string; // in ETH
  stopLossPct: number; // percentage (e.g., 5 for 5%)
  strategyGraphJSON?: string;
}

export function useWeb3() {
  const [state, setState] = useState<Web3State>({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled =
    typeof window !== "undefined" && window.ethereum !== undefined;

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask is not installed. Please install MetaMask to continue.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not available");
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Check if on Sepolia
      if (chainId !== SEPOLIA_CHAIN_ID) {
        // Try to switch to Sepolia
        try {
          if (!window.ethereum) {
            throw new Error("MetaMask not available");
          }
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          // If Sepolia is not added, add it
          if (switchError.code === 4902) {
            if (!window.ethereum) {
              throw new Error("MetaMask not available");
            }
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                  chainName: "Sepolia Testnet",
                  nativeCurrency: {
                    name: "SepoliaETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: [SEPOLIA_RPC_URL],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      setState({
        provider,
        signer,
        address,
        chainId,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message || "Failed to connect wallet",
      }));
    }
  }, [isMetaMaskInstalled]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== state.address) {
        connect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [isMetaMaskInstalled, state.address, connect, disconnect]);

  return {
    ...state,
    isMetaMaskInstalled,
    connect,
    disconnect,
  };
}

export function useAgentRegistry() {
  const { provider, signer, address, isConnected } = useWeb3();
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contract
  useEffect(() => {
    if (!provider || !REGISTRY_ADDRESS) return;

    const contractInstance = new Contract(
      REGISTRY_ADDRESS,
      AgentRegistryABI,
      signer || provider
    );
    setContract(contractInstance);
  }, [provider, signer]);

  // Get deployment fee
  const getDeploymentFee = useCallback(async (): Promise<string> => {
    if (!contract) return "0";
    try {
      const fee = await contract.deploymentFee();
      return ethers.formatEther(fee);
    } catch (err: any) {
      console.error("Error getting deployment fee:", err);
      return "0.001";
    }
  }, [contract]);

  // Deploy a new agent
  const deployAgent = useCallback(
    async (params: AgentDeployParams) => {
      if (!contract || !signer) {
        throw new Error("Wallet not connected");
      }

      if (!REGISTRY_ADDRESS) {
        throw new Error("Contract address not configured");
      }

      setIsLoading(true);
      setError(null);

      try {
        const deploymentFee = await contract.deploymentFee();

        // Convert position size to wei
        const positionSizeWei = ethers.parseEther(params.positionSize);

        // Convert stop loss to basis points
        const stopLossBps = BigInt(params.stopLossPct * 100);

        const tx = await contract.deployAgent(
          params.name,
          params.strategyType,
          params.tokenPair,
          params.trigger,
          positionSizeWei,
          stopLossBps,
          params.strategyGraphJSON || "",
          { value: deploymentFee }
        );

        const receipt = await tx.wait();

        // Parse event to get tokenId and agent contract
        const deployEvent = receipt.logs.find(
          (log: any) => {
            try {
              const parsed = contract.interface.parseLog(log);
              return parsed?.name === "AgentDeployed";
            } catch {
              return false;
            }
          }
        );

        if (deployEvent) {
          const parsed = contract.interface.parseLog(deployEvent);
          if (!parsed) {
            return { transactionHash: receipt.hash };
          }
          return {
            tokenId: parsed.args.tokenId.toString(),
            agentContract: parsed.args.agentContract,
            transactionHash: receipt.hash,
          };
        }

        return { transactionHash: receipt.hash };
      } catch (err: any) {
        console.error("Error deploying agent:", err);
        setError(err.message || "Failed to deploy agent");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, signer]
  );

  // Get user's agents
  const getUserAgents = useCallback(
    async (userAddress?: string): Promise<OnChainAgent[]> => {
      if (!contract) return [];

      const targetAddress = userAddress || address;
      if (!targetAddress) return [];

      setIsLoading(true);
      setError(null);

      try {
        const tokenIds = await contract.getUserAgents(targetAddress);

        const agents: OnChainAgent[] = await Promise.all(
          tokenIds.map(async (tokenId: bigint) => {
            const metadata = await contract.getAgentInfo(tokenId);
            const tokenURI = await contract.tokenURI(tokenId);

            return {
              tokenId: tokenId.toString(),
              owner: targetAddress,
              agentContract: metadata.agentContract,
              metadata: {
                name: metadata.name,
                strategyType: metadata.strategyType,
                tokenPair: metadata.tokenPair,
                trigger: metadata.trigger,
                positionSize: metadata.positionSize,
                stopLossPct: metadata.stopLossPct,
                isActive: metadata.isActive,
                createdAt: metadata.createdAt,
                agentContract: metadata.agentContract,
              },
              tokenURI,
            };
          })
        );

        return agents;
      } catch (err: any) {
        console.error("Error fetching user agents:", err);
        setError(err.message || "Failed to fetch agents");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [contract, address]
  );

  // Toggle agent status
  const toggleAgentStatus = useCallback(
    async (tokenId: string) => {
      if (!contract || !signer) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        const tx = await contract.toggleAgentStatus(tokenId);
        await tx.wait();
        return tx.hash;
      } catch (err: any) {
        console.error("Error toggling agent status:", err);
        setError(err.message || "Failed to toggle agent status");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, signer]
  );

  return {
    contract,
    isConnected,
    address,
    isLoading,
    error,
    getDeploymentFee,
    deployAgent,
    getUserAgents,
    toggleAgentStatus,
  };
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
