/**
 * Blockchain deployment panel for deploying agents to Sepolia
 */

"use client";

import { useState, useEffect } from "react";
import { useWeb3, useAgentRegistry, StrategyType } from "@/hooks/useWeb3";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Label } from "@/components/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/shared/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/shared/ui/alert";
import { Badge } from "@/components/shared/ui/badge";
import {
  Loader2,
  Wallet,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Activity,
} from "lucide-react";

interface DeployFormData {
  name: string;
  strategyType: StrategyType;
  tokenPair: string;
  trigger: string;
  positionSize: string;
  stopLossPct: string;
}

const STRATEGY_OPTIONS = [
  { value: StrategyType.SPOT, label: "Spot Trading", description: "Buy and sell at market prices" },
  { value: StrategyType.DCA, label: "DCA", description: "Dollar cost averaging" },
  { value: StrategyType.SNIPER, label: "Sniper", description: "Catch sudden price movements" },
  { value: StrategyType.MARGIN, label: "Margin", description: "Trade with leverage" },
  { value: StrategyType.MEME, label: "Meme", description: "High volatility trading" },
  { value: StrategyType.ARBITRAGE, label: "Arbitrage", description: "Exploit price differences" },
  { value: StrategyType.VISUAL, label: "Visual", description: "Custom strategy graph" },
];

const TOKEN_PAIRS = ["ETH/USD", "BTC/USD", "LINK/USD", "UNI/USD", "AAVE/USD"];

const TRIGGER_OPTIONS = [
  "PRICE_DROP_5PCT",
  "PRICE_DROP_10PCT",
  "PRICE_RISE_5PCT",
  "INTERVAL_1H",
  "INTERVAL_4H",
  "INTERVAL_24H",
];

export function BlockchainDeployPanel() {
  const {
    isConnected,
    isConnecting,
    address,
    connect,
    isMetaMaskInstalled,
    error: web3Error,
  } = useWeb3();

  const {
    deployAgent,
    getDeploymentFee,
    isLoading,
    error: registryError,
  } = useAgentRegistry();

  const [deploymentFee, setDeploymentFee] = useState("0.001");
  const [deployResult, setDeployResult] = useState<{
    tokenId?: string;
    agentContract?: string;
    transactionHash?: string;
  } | null>(null);

  const [formData, setFormData] = useState<DeployFormData>({
    name: "",
    strategyType: StrategyType.SPOT,
    tokenPair: "ETH/USD",
    trigger: "PRICE_DROP_5PCT",
    positionSize: "0.1",
    stopLossPct: "5",
  });

  // Fetch deployment fee on mount
  useEffect(() => {
    getDeploymentFee().then((fee) => {
      if (fee) setDeploymentFee(fee);
    });
  }, [getDeploymentFee]);

  const handleDeploy = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    try {
      const result = await deployAgent({
        name: formData.name,
        strategyType: formData.strategyType,
        tokenPair: formData.tokenPair,
        trigger: formData.trigger,
        positionSize: formData.positionSize,
        stopLossPct: parseInt(formData.stopLossPct),
      });

      setDeployResult(result);
    } catch (err) {
      // Error handled in hook
    }
  };

  const error = web3Error || registryError;

  return (
    <div className="space-y-6">
      {/* Wallet Connection Status */}
      {!isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </CardTitle>
            <CardDescription>
              Connect your MetaMask wallet to deploy agents to Sepolia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isMetaMaskInstalled ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>MetaMask Required</AlertTitle>
                <AlertDescription>
                  Please install MetaMask to deploy agents on-chain.{" "}
                  <a
                    href="https://metamask.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Download MetaMask
                  </a>
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                onClick={connect}
                disabled={isConnecting}
                className="w-full"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Connected Wallet Info */}
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Wallet Connected</AlertTitle>
            <AlertDescription className="text-green-700">
              Address: {" "}
              <code className="bg-green-100 px-1 rounded">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </code>
            </AlertDescription>
          </Alert>

          {/* Deployment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Deploy Agent to Sepolia
              </CardTitle>
              <CardDescription>
                Deploy your AI trading agent as an NFT on the Sepolia testnet
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {deployResult && (
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">
                    Agent Deployed Successfully!
                  </AlertTitle>
                  <AlertDescription className="space-y-2 text-blue-700">
                    {deployResult.tokenId && (
                      <div>Token ID: <Badge>#{deployResult.tokenId}</Badge></div>
                    )}
                    {deployResult.agentContract && (
                      <div>
                        Agent Contract:{" "}
                        <a
                          href={`https://sepolia.etherscan.io/address/${deployResult.agentContract}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-mono"
                        >
                          {deployResult.agentContract.slice(0, 6)}...
                          {deployResult.agentContract.slice(-4)}
                        </a>
                      </div>
                    )}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${deployResult.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline"
                    >
                      View Transaction
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="My Trading Agent"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Strategy Type</Label>
                <Select
                  value={formData.strategyType.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      strategyType: parseInt(value) as StrategyType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGY_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.toString()}
                      >
                        {option.label} - {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Token Pair</Label>
                  <Select
                    value={formData.tokenPair}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, tokenPair: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOKEN_PAIRS.map((pair) => (
                        <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select
                    value={formData.trigger}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, trigger: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((trigger) => (
                        <SelectItem key={trigger} value={trigger}>
                          {trigger}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="positionSize">Position Size (ETH)</Label>
                  <Input
                    id="positionSize"
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={formData.positionSize}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        positionSize: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.stopLossPct}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        stopLossPct: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                <span>Deployment Fee: {deploymentFee} ETH</span>
                <span>Network: Sepolia</span>
              </div>

              <Button
                onClick={handleDeploy}
                disabled={isLoading || !formData.name}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    Deploy Agent to Sepolia
                    <Badge variant="secondary" className="ml-2">
                      {deploymentFee} ETH
                    </Badge>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
