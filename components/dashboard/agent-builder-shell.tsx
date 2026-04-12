'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, Save } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shared/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { dashboardNavItems } from '@/data/dashboard/mock-data';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopHeader } from '@/components/dashboard/top-header';
import { RightPanel } from '@/components/dashboard/right-panel';
import { AgentBuilderForm } from '@/components/dashboard/agent-builder-form';
import { AgentBuilderDragDrop } from '@/components/dashboard/agent-builder-drag-drop';
import { ToggleGroup, ToggleGroupItem } from '@/components/shared/ui/toggle-group';
import {
  AgentBuilderSaveProvider,
  useAgentBuilderSave,
} from '@/components/dashboard/agent-builder-save-context';
import {
  createSavedAgentRecord,
  getSavedAgent,
  persistSavedAgent,
  type SavedAgentRecord,
} from '@/lib/saved-agents';
import { cn } from '@/lib/utils';

type BuilderMode = 'form' | 'drag';

export const AgentBuilderShell = () => {
  return (
    <AgentBuilderSaveProvider>
      <AgentBuilderShellInner />
    </AgentBuilderSaveProvider>
  );
};

function AgentBuilderShellInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');
  const { captureSavePayload } = useAgentBuilderSave();

  const [builderMode, setBuilderMode] = useState<BuilderMode>('form');
  const [hydratedDraft, setHydratedDraft] = useState<SavedAgentRecord | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) {
      return;
    }
    const record = getSavedAgent(draftId);
    if (record) {
      setHydratedDraft(record);
      setBuilderMode(record.mode);
      router.replace('/agent-builder', { scroll: false });
    }
  }, [draftId, router]);

  useEffect(() => {
    setSaveHint(null);
  }, [builderMode]);

  const openSaveDialog = () => {
    setSaveOk(null);
    const payload = captureSavePayload();
    if (!payload) {
      setSaveHint(
        builderMode === 'form'
          ? 'Enter an agent name (3+ characters) and a trigger before saving.'
          : 'Enter an agent name (3+ characters) before saving.',
      );
      return;
    }
    setSaveHint(null);
    setSaveTitle(payload.name);
    setSaveOpen(true);
  };

  const confirmSave = () => {
    const payload = captureSavePayload();
    if (!payload) {
      setSaveOpen(false);
      return;
    }
    const record = createSavedAgentRecord(payload, saveTitle.trim() || payload.name);
    persistSavedAgent(record);
    setSaveOpen(false);
    setSaveOk(`Saved “${record.title}” to Agent's library.`);
  };

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

              <div className="mt-6 rounded-2xl border border-gray-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/40 sm:p-8">
                <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                      Build your trading agent
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Use the form for a guided setup, or drag blocks to compose a strategy graph. Save drafts
                      to your library anytime.
                    </p>
                  </div>
                  <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch lg:w-auto lg:items-center lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openSaveDialog}
                      className="h-10 rounded-full border-gray-200/80 bg-white/90 dark:border-gray-800/70 dark:bg-gray-950/50"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save draft
                    </Button>
                    <ToggleGroup
                      type="single"
                      value={builderMode}
                      onValueChange={(value) => {
                        if (value === 'form' || value === 'drag') {
                          setBuilderMode(value);
                        }
                      }}
                      variant="outline"
                      className="h-auto w-full justify-stretch gap-0 rounded-full border border-gray-200/80 bg-white/90 p-1 sm:w-auto dark:border-gray-800/70 dark:bg-gray-950/50"
                    >
                      <ToggleGroupItem
                        value="form"
                        aria-label="Form builder"
                        className="flex-1 rounded-full px-4 data-[state=on]:bg-primary-500 data-[state=on]:text-white data-[state=on]:hover:bg-primary-600 sm:flex-initial"
                      >
                        Form
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="drag"
                        aria-label="Drag and drop builder"
                        className="flex-1 rounded-full px-4 data-[state=on]:bg-primary-500 data-[state=on]:text-white data-[state=on]:hover:bg-primary-600 sm:flex-initial"
                      >
                        Drag &amp; drop
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                {saveHint ? (
                  <div
                    className={cn(
                      'mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950',
                      'dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100',
                    )}
                    role="status"
                  >
                    {saveHint}
                  </div>
                ) : null}

                {saveOk ? (
                  <div
                    className={cn(
                      'mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950',
                      'dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100',
                    )}
                    role="status"
                  >
                    {saveOk}
                  </div>
                ) : null}

                <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                  <DialogContent className="border-border sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Save to library</DialogTitle>
                      <DialogDescription>
                        Drafts are stored in this browser. Open them anytime from Agent&apos;s library.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                      <Label htmlFor="agent-save-title">Display title</Label>
                      <Input
                        id="agent-save-title"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        placeholder="e.g., EMA crossover v2"
                        className="h-10"
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="bg-primary-500 text-white hover:bg-primary-600"
                        onClick={confirmSave}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {builderMode === 'form' ? (
                  <AgentBuilderForm showHeader={false} initialDraft={hydratedDraft} />
                ) : (
                  <AgentBuilderDragDrop initialDraft={hydratedDraft} />
                )}
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
}
