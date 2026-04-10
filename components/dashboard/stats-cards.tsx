'use client';

import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';
import type { StatCard } from '@/data/dashboard/mock-data';
import { Sparkline } from '@/components/dashboard/sparkline';
import { GlassCard } from '@/components/dashboard/glass';

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);

const formatPct = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

export const StatsCardsRow = ({
  items,
  className,
}: {
  items: StatCard[];
  className?: string;
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 lg:grid-cols-4">
        {items.map((item) =>
          item.symbol === 'PROMO' ? (
            <PromoCard key={item.symbol} />
          ) : (
            <TokenStatCard key={item.symbol} item={item} />
          ),
        )}
      </div>
    </div>
  );
};

const TokenStatCard = ({ item }: { item: StatCard }) => {
  const isUp = item.changePct >= 0;
  return (
    <GlassCard
      className={cn(
        'min-w-72 p-4 transition',
        'hover:-translate-y-0.5 hover:shadow-lg',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-xs font-semibold text-gray-900 dark:text-gray-100">
              {item.symbol}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                {item.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.symbol}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {formatUsd(item.price)}
            </div>
            <div
              className={cn(
                'text-xs font-semibold tabular-nums',
                isUp
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {formatPct(item.changePct)}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-xl p-2',
            isUp
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          )}
        >
          <Sparkline points={item.points} className="h-9 w-24" />
        </div>
      </div>
    </GlassCard>
  );
};

const PromoCard = () => {
  return (
    <GlassCard className="min-w-72 p-4">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-600 dark:text-primary-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="rounded-full bg-secondary-500/10 px-3 py-1 text-xs font-semibold text-secondary-700 dark:text-secondary-200">
            New
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Automated staking routes
          </div>
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Optimize yields with policy-based rebalancing and alerts.
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="w-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-500 hover:to-secondary-500"
        >
          Explore automation
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </GlassCard>
  );
};

