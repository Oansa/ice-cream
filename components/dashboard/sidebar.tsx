'use client';

import {
  LayoutDashboard,
  Bot,
  Library,
  Shield,
  ListChecks,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from '@/data/dashboard/mock-data';

const navIconByKey = {
  dashboard: LayoutDashboard,
  'agent-builder': Bot,
  'agents-library': Library,
  staking: Shield,
  orders: ListChecks,
  'data-api': Database,
} as const;

export const DashboardSidebar = ({
  activeKey,
  items,
  className,
}: {
  activeKey: DashboardNavItem['key'];
  items: DashboardNavItem[];
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex h-full flex-col gap-6',
        'rounded-2xl border border-gray-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-lg',
        'dark:border-gray-800/60 dark:bg-gray-950/40',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/25 to-secondary-500/20 text-base font-bold tabular-nums text-primary-700 ring-1 ring-primary-500/25 dark:text-primary-200"
          aria-label="icecream"
        >
          I
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            icecream
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Trading desk
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = navIconByKey[item.key];
          const isActive = item.key === activeKey;
          return (
            <a
              key={item.key}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary-500/10 text-gray-900 ring-1 ring-primary-500/20 dark:text-gray-50'
                  : 'text-gray-600 hover:bg-gray-900/5 dark:text-gray-300 dark:hover:bg-white/5',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  isActive
                    ? 'bg-gradient-to-br from-primary-500/20 to-secondary-500/20 text-primary-500'
                    : 'bg-gray-900/5 text-gray-500 dark:bg-white/5 dark:text-gray-400',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive ? (
                <span className="h-2 w-2 rounded-full bg-secondary-500 ring-4 ring-secondary-500/10 dark:ring-secondary-500/15" />
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 p-3 ring-1 ring-primary-500/10 dark:ring-primary-500/20">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Pro signals
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Automate strategies
          </div>
        </div>
        <div className="h-9 rounded-full bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm dark:bg-white dark:text-gray-950">
          <div className="flex h-full items-center">Upgrade</div>
        </div>
      </div>
    </div>
  );
};
