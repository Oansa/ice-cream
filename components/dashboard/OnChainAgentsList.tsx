/**
 * Component to display user's on-chain agents from Sepolia
 */

"use client";

import { useState, useEffect } from "react";
import { useWeb3, useAgentRegistry, OnChainAgent, StrategyTypeNames } from "@/hooks/useWeb3";
import { DASHBOARD_SURFACE } from "@/lib/dashboard-surface";
import { Button } from "@/components/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/card";
import { Badge } from "@/components/shared/ui/badge";
import { Alert, AlertDescription } from "@/components/shared/ui/alert";
import { Skeleton } from "@/components/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import {
  ExternalLink,
  Wallet,
  Activity,
  Pause,
  Play,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export function OnChainAgentsList() {
  const { isConnected, connect, address } = useWeb3();
  const {
    getUserAgents,
    toggleAgentStatus,
    isLoading,
    error,
  } = useAgentRegistry();

  const [agents, setAgents] = useState<OnChainAgent[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadAgents = async () => {
    if (!isConnected || !address) return;
    const userAgents = await getUserAgents(address);
    setAgents(userAgents);
  };

  useEffect(() => {
    loadAgents();
  }, [isConnected, address]);

  const handleToggle = async (tokenId: string) => {
    setTogglingId(tokenId);
    try {
      await toggleAgentStatus(tokenId);
      await loadAgents(); // Refresh list
    } finally {
      setTogglingId(null);
    }
  };

  if (!isConnected) {
    return (
      <Card className={DASHBOARD_SURFACE}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            On-Chain Agents
          </CardTitle>
          <CardDescription>
            Connect your wallet to view your Sepolia agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={connect} variant="outline" className="w-full">
            <Wallet className="mr-2 h-4 w-4" />
            Connect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={DASHBOARD_SURFACE}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              On-Chain Agents
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Your AI agents deployed on Sepolia
              <Badge variant="default" className="text-xs font-bold">CONNECTED!</Badge>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAgents}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No agents deployed yet</p>
            <p className="text-sm">Deploy your first agent to Sepolia!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.tokenId}>
                  <TableCell>
                    <Badge variant="outline">#{agent.tokenId}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {agent.metadata.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {StrategyTypeNames[agent.metadata.strategyType as keyof typeof StrategyTypeNames]}
                    </Badge>
                  </TableCell>
                  <TableCell>{agent.metadata.tokenPair}</TableCell>
                  <TableCell>
                    <Badge
                      variant={agent.metadata.isActive ? "default" : "secondary"}
                    >
                      {agent.metadata.isActive ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(
                      Number(agent.metadata.createdAt) * 1000
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(agent.tokenId)}
                        disabled={togglingId === agent.tokenId}
                      >
                        {togglingId === agent.tokenId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : agent.metadata.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={`https://sepolia.etherscan.io/token/${process.env.NEXT_PUBLIC_AGENT_REGISTRY}?a=${agent.tokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
