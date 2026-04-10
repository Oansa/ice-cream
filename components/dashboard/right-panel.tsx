'use client';

import { Wallet, ArrowRightLeft, ArrowDownUp } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/dashboard/glass';

const FieldLabel = ({ children }: { children: string }) => (
  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
    {children}
  </div>
);

const ValuePill = ({ children }: { children: string }) => (
  <div className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-white/5 dark:text-gray-200">
    {children}
  </div>
);

export const RightPanel = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <ConnectWalletCard />
      <ExchangeWidget />
    </div>
  );
};

const ConnectWalletCard = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-500/20 bg-gradient-to-br from-primary-500/15 via-secondary-500/10 to-white/40 p-4 shadow-sm backdrop-blur-lg dark:border-primary-500/30 dark:from-primary-500/20 dark:via-secondary-500/10 dark:to-gray-950/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-700 dark:text-primary-200">
          <Wallet className="h-5 w-5" />
        </div>
        <ValuePill>Secure</ValuePill>
      </div>

      <div className="mt-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          Connect wallet
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
          Trade, stake, and automate strategies with a single session.
        </div>
      </div>

      <Button
        className="mt-4 w-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-500 hover:to-secondary-500"
      >
        Connect
      </Button>
    </div>
  );
};

const ExchangeWidget = () => {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          Exchange
        </div>
        <ValuePill>Fast</ValuePill>
      </div>

      <Tabs defaultValue="buy" className="mt-3">
        <TabsList className="w-full rounded-full bg-gray-900/5 p-1 dark:bg-white/5">
          <TabsTrigger value="buy" className="w-full rounded-full">
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="w-full rounded-full">
            Sell
          </TabsTrigger>
          <TabsTrigger value="swap" className="w-full rounded-full">
            Swap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-4">
          <TradeForm mode="buy" />
        </TabsContent>
        <TabsContent value="sell" className="mt-4">
          <TradeForm mode="sell" />
        </TabsContent>
        <TabsContent value="swap" className="mt-4">
          <TradeForm mode="swap" />
        </TabsContent>
      </Tabs>
    </GlassCard>
  );
};

const TradeForm = ({ mode }: { mode: 'buy' | 'sell' | 'swap' }) => {
  const ctaLabel = mode === 'swap' ? 'Swap now' : mode === 'sell' ? 'Sell now' : 'Buy now';
  const icon = mode === 'swap' ? ArrowRightLeft : ArrowDownUp;
  const Icon = icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel>Balance</FieldLabel>
        <div className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">
          2,418.42 USDC
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Pay</FieldLabel>
        <Input
          placeholder="0.00"
          inputMode="decimal"
          className={cn(
            'h-11 rounded-xl',
            'bg-white/60 dark:bg-gray-950/30',
            'border-gray-200/70 dark:border-gray-800/60',
            'focus-visible:ring-primary-500/30',
          )}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Receive</FieldLabel>
        <Input
          placeholder="0.00"
          inputMode="decimal"
          className={cn(
            'h-11 rounded-xl',
            'bg-white/60 dark:bg-gray-950/30',
            'border-gray-200/70 dark:border-gray-800/60',
            'focus-visible:ring-secondary-500/30',
          )}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-gray-900/5 px-3 py-2 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300">
        <span>Gas fee</span>
        <span className="font-semibold tabular-nums">$0.42</span>
      </div>

      <Button className="w-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-500 hover:to-secondary-500">
        <Icon className="mr-2 h-4 w-4" />
        {ctaLabel}
      </Button>
    </div>
  );
};

