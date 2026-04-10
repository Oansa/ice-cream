'use client';

import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { cn } from '@/lib/utils';
import type { TokenRow } from '@/data/dashboard/mock-data';
import { Sparkline } from '@/components/dashboard/sparkline';
import { GlassCard } from '@/components/dashboard/glass';

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);

const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);

const formatPct = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

const ChangeCell = ({ value }: { value: number }) => {
  const isUp = value >= 0;
  return (
    <span
      className={cn(
        'text-sm font-medium tabular-nums',
        isUp
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400',
      )}
    >
      {formatPct(value)}
    </span>
  );
};

export const TokensTable = ({
  title,
  rows,
  className,
}: {
  title: string;
  rows: TokenRow[];
  className?: string;
}) => {
  return (
    <GlassCard className={cn('p-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search pools…"
              className={cn(
                'h-10 rounded-full pl-10',
                'bg-white/60 dark:bg-gray-950/30',
                'border-gray-200/70 dark:border-gray-800/60',
              )}
            />
          </div>
          <Button variant="outline" size="sm" className="rounded-full">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Pool name</TableHead>
              <TableHead className="text-xs">Price</TableHead>
              <TableHead className="text-xs">1h %</TableHead>
              <TableHead className="text-xs">24h %</TableHead>
              <TableHead className="text-xs">7d %</TableHead>
              <TableHead className="text-xs">Volume</TableHead>
              <TableHead className="text-xs">Last 7 days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.symbol}
                className={cn(
                  'cursor-default',
                  'hover:bg-primary-500/5 dark:hover:bg-primary-500/10',
                )}
              >
                <TableCell className="min-w-56">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {row.symbol}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {row.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.symbol}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-50">
                  {formatUsd(row.price)}
                </TableCell>

                <TableCell>
                  <ChangeCell value={row.change1hPct} />
                </TableCell>
                <TableCell>
                  <ChangeCell value={row.change24hPct} />
                </TableCell>
                <TableCell>
                  <ChangeCell value={row.change7dPct} />
                </TableCell>

                <TableCell className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
                  {formatCompact(row.volume)}
                </TableCell>

                <TableCell>
                  <div className="text-secondary-600 dark:text-secondary-300">
                    <Sparkline points={row.sparkline} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </GlassCard>
  );
};

