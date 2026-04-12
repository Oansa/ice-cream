'use client';

import Link from 'next/link';
import { RefreshCcw, Bot } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { cn } from '@/lib/utils';

export const DashboardHeader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 sm:text-2xl">
          Trading agents
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          What your bots are doing right now—and how much you are making.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="rounded-md" asChild>
          <Link href="/agent-builder">
            <Bot className="mr-2 h-4 w-4" />
            Agent builder
          </Link>
        </Button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    </div>
  );
};
