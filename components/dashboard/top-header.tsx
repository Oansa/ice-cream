'use client';

import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { ThemeSwitch } from '@/components/shared/ThemeSwitch';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { cn } from '@/lib/utils';

export const DashboardTopHeader = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex h-14 items-center justify-between gap-4',
        className,
      )}
    >
      <div className="hidden items-center gap-2 text-sm text-gray-500 dark:text-gray-400 md:flex">
        <span className="text-gray-900 dark:text-gray-100">Home</span>
        <span className="text-gray-400 dark:text-gray-600">/</span>
        <span>Dashboard</span>
      </div>

      <div className="relative flex-1 md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <Input
          placeholder="Search agents, strategies…"
          className={cn(
            'h-10 rounded-full pl-10',
            'bg-white/70 dark:bg-gray-950/40',
            'border-gray-200/70 dark:border-gray-800/60',
            'focus-visible:ring-primary-500/30 dark:focus-visible:ring-primary-500/30',
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-gray-200/70 bg-white/70 px-3 py-2 text-xs text-gray-500 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/40 dark:text-gray-400 lg:flex">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            ⌘K
          </span>
          <span>Quick actions</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="hidden rounded-full md:inline-flex"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Customize
        </Button>

        <Button
          variant="outlinePrimary"
          size="icon"
          className="rounded-full"
          aria-label="Automation presets"
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        <div className="rounded-full border border-gray-200/70 bg-white/70 p-2 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/40">
          <ThemeSwitch />
        </div>
      </div>
    </div>
  );
};

