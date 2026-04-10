'use client';

import { RefreshCcw, SlidersHorizontal, Columns2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';

export const DashboardHeader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 sm:text-2xl">
          Staking dashboard
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Monitor and manage your staked assets in real time.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="rounded-full">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          <Columns2 className="mr-2 h-4 w-4" />
          Compare
        </Button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-primary-700 hover:bg-primary-500/10 dark:text-primary-300 dark:hover:bg-primary-500/10"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
};

