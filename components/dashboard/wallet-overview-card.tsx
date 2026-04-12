'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { CheckCircle, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_SURFACE } from '@/lib/dashboard-surface';
import useTradingStore from '@/lib/stores/useTradingStore';
import type { WalletOverview } from '@/data/dashboard/mock-data';

const formatEth = (ethStr: string) => {
  const eth = parseFloat(ethStr);
  return isNaN(eth) ? '0 ETH' : eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' ETH';
};
const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const formatUsd = (valueUsd: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(valueUsd);

export const WalletOverviewCard = ({ className }: { className?: string }) => {
  const store = useTradingStore();
  const { web3Connected, web3Address, web3BalanceEth } = store;

  if (web3Connected) {
    // Profile card for connected wallet
    return (
      <Card className={cn(DASHBOARD_SURFACE, className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            MetaMask Balance
          </CardTitle>
          <CardDescription>Sepolia Testnet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
              {formatEth(web3BalanceEth)}
            </p>
            <Badge variant="outline" className="text-xs">
              ~${(parseFloat(web3BalanceEth.replace(' ETH', '')) * 3500).toLocaleString()} USD
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {truncateAddress(web3Address!)}
            </span>
            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
            <span className="text-xs text-green-600 font-bold uppercase">Connected!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback simulation
  const data = {
    totalBalanceUsd: store.totalBalanceUsd,
    balanceSubtitle: 'Live simulation balance',
    change24hPct: store.pnlPct,
    holdings: [],
  } as WalletOverview;

  const hasChange = typeof data.change24hPct === 'number';
  const changeUp = hasChange && data.change24hPct! >= 0;

  return (
    <Card className={cn(DASHBOARD_SURFACE, className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Total balance</CardTitle>
        <CardDescription>{data.balanceSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {data.totalBalanceUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
          {hasChange ? (
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                changeUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {(data.change24hPct! > 0 ? '+' : '') + data.change24hPct!.toFixed(2) + '%'}
              <span className="ml-1 font-normal text-muted-foreground">24h</span>
            </span>
          ) : null}
        </div>

        {data.holdings && data.holdings.length > 0 ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-200/70 pt-4 dark:border-gray-800/60">
            {data.holdings.map((h) => (
              <div key={h.label} className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{h.label}</p>
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatUsd(h.valueUsd)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

