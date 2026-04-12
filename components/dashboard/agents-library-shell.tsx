'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Trash2, Pencil, Library } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shared/ui/sheet';
import { dashboardNavItems } from '@/data/dashboard/mock-data';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopHeader } from '@/components/dashboard/top-header';
import { RightPanel } from '@/components/dashboard/right-panel';
import {
  deleteSavedAgent,
  listSavedAgents,
  type SavedAgentRecord,
} from '@/lib/saved-agents';
import { cn } from '@/lib/utils';

const formatSavedAt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
};

export const AgentsLibraryShell = () => {
  const [agents, setAgents] = useState<SavedAgentRecord[]>([]);

  const refresh = useCallback(() => {
    setAgents(listSavedAgents());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = (id: string) => {
    deleteSavedAgent(id);
    refresh();
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gradient-to-b from-primary-500/10 via-white to-white dark:from-primary-500/10 dark:via-gray-950 dark:to-gray-950">
        <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="hidden lg:col-span-2 lg:block">
              <div className="sticky top-6 h-dvh">
                <DashboardSidebar
                  activeKey="agents-library"
                  items={dashboardNavItems}
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
                        activeKey="agents-library"
                        items={dashboardNavItems}
                        className="h-full"
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  Agent&apos;s library
                </div>
              </div>

              <DashboardTopHeader className="mt-4 lg:mt-0" />

              <div className="mt-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                      Agent&apos;s library
                    </h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Saved drafts from the agent builder. Open one to keep editing or deploy.
                    </p>
                  </div>
                  <Button
                    asChild
                    className="h-11 shrink-0 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 font-semibold text-white"
                  >
                    <Link href="/agent-builder">New agent</Link>
                  </Button>
                </div>

                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <Library className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground">Saved agents</CardTitle>
                        <CardDescription>
                          Stored in this browser ({agents.length} {agents.length === 1 ? 'item' : 'items'}
                          ).
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {agents.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        No saved agents yet. Use <strong>Save draft</strong> in Agent Builder, then return
                        here.
                      </p>
                    ) : (
                      agents.map((agent) => (
                        <Card
                          key={agent.id}
                          className="border-border bg-card shadow-none transition-colors hover:border-primary-500/25"
                        >
                          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="font-bold text-foreground">{agent.title}</p>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{agent.name}</span>
                                {' · '}
                                {agent.token_pair}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                                    agent.mode === 'drag'
                                      ? 'bg-secondary-500/10 text-secondary-800 dark:text-secondary-300'
                                      : 'bg-muted text-muted-foreground'
                                  )}
                                >
                                  {agent.mode === 'drag' ? 'Drag & drop' : 'Form'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Saved {formatSavedAt(agent.savedAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                <Link href={`/agent-builder?draft=${encodeURIComponent(agent.id)}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Open in builder
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30 sm:w-auto"
                                type="button"
                                onClick={() => handleDelete(agent.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
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
