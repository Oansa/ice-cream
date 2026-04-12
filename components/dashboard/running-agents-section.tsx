'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Play, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_SURFACE, DASHBOARD_SURFACE_NESTED } from '@/lib/dashboard-surface';
import type { SimulatedAgent } from '@/types/trading';
import useTradingStore from '@/lib/stores/useTradingStore';

const formatPnl = (usd: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);

export const RunningAgentsSection = ({ className }: { className?: string }) => {
  const store = useTradingStore();
  const agents = store.agents as SimulatedAgent[];

  return (
    <Card className={cn(DASHBOARD_SURFACE, className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Running agents</CardTitle>
        <CardDescription>Live status and P&amp;L for your trading agents.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No agents running. Build and deploy one from Agent Builder.
          </p>
        ) : (
          agents.map((agent) => <AgentRowCard key={agent.id} agent={agent} />)
        )}
      </CardContent>
    </Card>
  );
};

function AgentRowCard({ agent }: { agent: SimulatedAgent }) {
  const store = useTradingStore();
  const isActive = agent.status === 'active';
  const pnlPositive = agent.pnlUsd > 0;
  const pnlNegative = agent.pnlUsd < 0;

  return (
    <Card className={DASHBOARD_SURFACE_NESTED}>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              'mt-2 h-2 w-2 shrink-0 rounded-full',
              isActive ? 'bg-emerald-500' : 'bg-muted-foreground/45',
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <p className="font-bold text-foreground">{agent.name}</p>
            <p className="text-sm text-muted-foreground">{agent.tradingPair}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {isActive ? 'RUNNING' : 'PAUSED'}
              </span>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                  agent.currentAction === 'HOLD' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                  agent.currentAction === 'BUY' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                  'bg-red-500/10 text-red-700 dark:text-red-400'
                )}
              >
                {agent.currentAction}
              </span>
              <span className="text-xs text-muted-foreground">
                {agent.pnlPct.toFixed(2)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => store.toggleAgent(agent.id)}
                className="ml-auto h-6 w-6 p-0"
              >
                {isActive ? (
                  <Power className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p className="text-xs font-medium text-muted-foreground">P&amp;L</p>
          <p
            className={cn(
              'text-lg font-bold tabular-nums',
              pnlPositive && 'text-emerald-600 dark:text-emerald-400',
              pnlNegative && 'text-red-600 dark:text-red-400',
              !pnlPositive && !pnlNegative && 'text-foreground',
            )}
          >
            {formatPnl(agent.pnlUsd)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
