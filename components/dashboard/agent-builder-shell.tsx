'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shared/ui/sheet';
import {
  dashboardNavItems,
  watchlist,
} from '@/data/dashboard/mock-data';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopHeader } from '@/components/dashboard/top-header';
import { RightPanel } from '@/components/dashboard/right-panel';
import { AgentBuilderForm } from '@/components/dashboard/agent-builder-form';

export const AgentBuilderShell = () => {
  return (
    <div className="w-full">
      <div className="w-full bg-gradient-to-b from-primary-500/10 via-white to-white dark:from-primary-500/10 dark:via-gray-950 dark:to-gray-950">
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="hidden lg:col-span-2 lg:block">
              <div className="sticky top-6 h-dvh">
                <DashboardSidebar
                  activeKey="agent-builder"
                  items={dashboardNavItems}
                  watchlistItems={watchlist}
                  className="h-full"
                />
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      aria-label="Open navigation"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="border-gray-200/70 bg-white/80 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/70"
                  >
                    <SheetHeader>
                      <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 h-full">
                      <DashboardSidebar
                        activeKey="agent-builder"
                        items={dashboardNavItems}
                        watchlistItems={watchlist}
                        className="h-full"
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Agent Builder
                </div>
              </div>

              <DashboardTopHeader className="mt-4 lg:mt-0" />

              <div className="mt-6 rounded-2xl border border-gray-200/70 bg-white/70 p-8 shadow-sm backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/40">
                <AgentBuilderForm />
              </div>

              <div className="mt-6 lg:hidden">
                <RightPanel />
              </div>
            </div>

            <div className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-6 h-dvh">
                <RightPanel className="h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
