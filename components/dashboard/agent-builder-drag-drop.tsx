'use client';

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader, Trash2, CheckCircle, AlertCircle, LayoutGrid } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { Label } from '@/components/shared/ui/label';
import { cn } from '@/lib/utils';
import type { DeployedAgent, StrategyType } from '@/lib/agent-builder';
import {
  COMMON_TOKEN_PAIRS,
  SUPPORTED_STRATEGIES,
  TRIGGER_EXAMPLES,
  deployAgent,
} from '@/lib/agent-builder';
import { emptyStrategyGraph, getEmaCrossoverTemplate } from '@/lib/strategy-graph-templates';
import type { StrategyGraphEdge, StrategyGraphNode } from '@/lib/strategy-graph-types';
import type { SavedAgentRecord } from '@/lib/saved-agents';
import { useAgentBuilderSave } from '@/components/dashboard/agent-builder-save-context';

const PALETTE_BLOCKS: { defId: string; label: string; category: string }[] = [
  { defId: 'trading-pair', label: 'Trading pair', category: 'Market' },
  { defId: 'timeframe', label: 'Timeframe', category: 'Market' },
  { defId: 'market-type', label: 'Market type', category: 'Market' },
  { defId: 'price', label: 'Price', category: 'Data' },
  { defId: 'volume', label: 'Volume', category: 'Data' },
  { defId: 'indicator', label: 'Indicator', category: 'Data' },
  { defId: 'crosses-above', label: 'Crosses above', category: 'Condition' },
  { defId: 'crosses-below', label: 'Crosses below', category: 'Condition' },
  { defId: 'greater-than', label: 'Greater than', category: 'Condition' },
  { defId: 'buy-signal', label: 'Buy signal', category: 'Signal' },
  { defId: 'sell-signal', label: 'Sell signal', category: 'Signal' },
  { defId: 'market-buy', label: 'Market buy', category: 'Execution' },
  { defId: 'market-sell', label: 'Market sell', category: 'Execution' },
  { defId: 'stop-loss', label: 'Stop loss', category: 'Risk' },
  { defId: 'take-profit', label: 'Take profit', category: 'Risk' },
];

const CANVAS_DROP_ID = 'strategy-canvas';

function defaultConfigForDef(defId: string): Record<string, unknown> {
  const map: Record<string, Record<string, unknown>> = {
    'trading-pair': { pair: 'BTC/USD' },
    timeframe: { timeframe: '15m' },
    'market-type': { type: 'spot' },
    price: {},
    volume: {},
    indicator: { indicator_name: 'EMA', period: 14 },
    'greater-than': {},
    'less-than': {},
    'crosses-above': {},
    'crosses-below': {},
    'buy-signal': {},
    'sell-signal': {},
    'market-buy': { position_size_percent: 2 },
    'market-sell': {},
    'stop-loss': { loss_percent: 3 },
    'take-profit': { profit_percent: 6 },
    'trailing-stop': {},
  };
  return map[defId] ? { ...map[defId] } : {};
}

function layoutNodePositions(list: StrategyGraphNode[]): StrategyGraphNode[] {
  return list.map((n, i) => ({
    ...n,
    position: { x: n.position?.x ?? 48, y: 48 + i * 88 },
  }));
}

function makeNode(defId: string, index: number): StrategyGraphNode {
  return {
    id: `${defId}-${uuidv4().slice(0, 8)}`,
    defId,
    position: { x: 48, y: 48 + index * 88 },
    config: defaultConfigForDef(defId),
  };
}

function PaletteDraggable({ defId, label }: { defId: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${defId}`,
    data: { source: 'palette' as const, defId },
  });

  return (
    <div ref={setNodeRef} className="touch-none">
      <Card
        className={cn(
          'border-gray-200/80 bg-card transition-opacity dark:border-gray-800/80',
          isDragging && 'opacity-60'
        )}
      >
        <CardContent className="flex items-center gap-2 p-3">
          <button
            type="button"
            className="flex flex-1 cursor-grab items-center gap-2 text-left active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function SortableNodeRow({
  node,
  onRemove,
}: {
  node: StrategyGraphNode;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'z-10')}>
      <Card className="border-gray-200/80 bg-card dark:border-gray-800/80">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Reorder block"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="h-5 w-5 shrink-0" />
            </button>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{node.defId}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{node.id}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-center"
            onClick={() => onRemove(node.id)}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Remove
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CanvasDropZone({
  children,
  isEmpty,
}: {
  children: ReactNode;
  isEmpty: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROP_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[220px] rounded-lg border border-dashed border-gray-300/90 bg-muted/20 p-4 transition-colors dark:border-gray-700/90 dark:bg-muted/10',
        isOver && 'border-primary-500/60 bg-primary-500/5 dark:border-primary-400/50'
      )}
    >
      {isEmpty ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Drag blocks here from the palette, or load the EMA crossover template.
        </p>
      ) : null}
      <div className={cn('space-y-3', isEmpty && 'mt-2')}>{children}</div>
    </div>
  );
}

interface AgentBuilderDragDropProps {
  onAgentDeployed?: (agent: DeployedAgent) => void;
  initialDraft?: SavedAgentRecord | null;
}

export const AgentBuilderDragDrop = ({
  onAgentDeployed,
  initialDraft = null,
}: AgentBuilderDragDropProps) => {
  const { registerSave } = useAgentBuilderSave();
  const formFieldId = useId();
  const [nodes, setNodes] = useState<StrategyGraphNode[]>(() => {
    const t = getEmaCrossoverTemplate();
    return layoutNodePositions(t.nodes);
  });
  const [edges, setEdges] = useState<StrategyGraphEdge[]>(() => {
    const t = getEmaCrossoverTemplate();
    return t.edges;
  });

  const [name, setName] = useState('');
  const [strategyType, setStrategyType] = useState<StrategyType>('VISUAL');
  const [tokenPair, setTokenPair] = useState('BTC/USD');
  const [trigger, setTrigger] = useState('INTERVAL_24H');
  const [positionSize, setPositionSize] = useState('100');
  const [stopLossPct, setStopLossPct] = useState('5');

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deployedAgent, setDeployedAgent] = useState<DeployedAgent | null>(null);
  const [activePalette, setActivePalette] = useState<{ defId: string; label: string } | null>(null);

  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    if (!initialDraft?.id) {
      return;
    }
    setName(initialDraft.name);
    setStrategyType(initialDraft.strategy_type);
    setTokenPair(initialDraft.token_pair);
    setTrigger(initialDraft.trigger);
    setPositionSize(initialDraft.position_size);
    setStopLossPct(initialDraft.stop_loss_pct);

    if (initialDraft.graph_nodes && initialDraft.graph_nodes.length > 0) {
      setNodes(layoutNodePositions(initialDraft.graph_nodes.map((n) => ({ ...n, config: { ...n.config } }))));
      setEdges((initialDraft.graph_edges ?? []).map((e) => ({ ...e })));
      return;
    }

    const raw = initialDraft.strategy_graph_json?.trim();
    if (raw) {
      try {
        const g = JSON.parse(raw) as {
          nodes?: StrategyGraphNode[];
          edges?: StrategyGraphEdge[];
        };
        setNodes(
          layoutNodePositions((g.nodes ?? []).map((n) => ({ ...n, config: { ...n.config } })))
        );
        setEdges((g.edges ?? []).map((e) => ({ ...e })));
      } catch {
        const t = getEmaCrossoverTemplate();
        setNodes(layoutNodePositions(t.nodes));
        setEdges(t.edges);
      }
    }
  }, [initialDraft?.id]);

  useEffect(() => {
    registerSave(() => {
      if (!name.trim() || name.trim().length < 3) {
        return null;
      }
      const graphJson =
        nodes.length > 0
          ? JSON.stringify({
              nodes,
              edges,
            })
          : '';
      return {
        mode: 'drag' as const,
        name: name.trim(),
        strategy_type: strategyType,
        token_pair: tokenPair,
        trigger: trigger.trim() || 'INTERVAL_24H',
        position_size: positionSize,
        stop_loss_pct: stopLossPct,
        strategy_graph_json: graphJson,
        graph_nodes: nodes.length > 0 ? nodes.map((n) => ({ ...n, config: { ...n.config } })) : undefined,
        graph_edges: edges.length > 0 ? edges.map((e) => ({ ...e })) : undefined,
      };
    });
    return () => registerSave(null);
  }, [
    registerSave,
    name,
    strategyType,
    tokenPair,
    trigger,
    positionSize,
    stopLossPct,
    nodes,
    edges,
  ]);

  const removeNode = useCallback(
    (id: string) => {
      setNodes((prev) => layoutNodePositions(prev.filter((n) => n.id !== id)));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    },
    []
  );

  const loadTemplate = useCallback(() => {
    const t = getEmaCrossoverTemplate();
    setNodes(layoutNodePositions(t.nodes));
    setEdges(t.edges);
    setErrorMessage(null);
  }, []);

  const clearGraph = useCallback(() => {
    const empty = emptyStrategyGraph();
    setNodes(empty.nodes);
    setEdges(empty.edges);
    setErrorMessage(null);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const src = event.active.data.current?.source;
    if (src === 'palette') {
      const defId = event.active.data.current?.defId as string;
      const label = PALETTE_BLOCKS.find((b) => b.defId === defId)?.label ?? defId;
      setActivePalette({ defId, label });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePalette(null);
    const { active, over } = event;
    if (!over) {
      return;
    }

    const isPalette = String(active.id).startsWith('palette-');
    if (isPalette) {
      const defId = active.data.current?.defId as string | undefined;
      if (!defId) {
        return;
      }

      let insertIndex = nodes.length;
      if (over.id === CANVAS_DROP_ID) {
        insertIndex = nodes.length;
      } else {
        const idx = nodes.findIndex((n) => n.id === over.id);
        if (idx >= 0) {
          insertIndex = idx;
        }
      }

      setNodes((prev) => {
        const next = [...prev];
        next.splice(insertIndex, 0, makeNode(defId, insertIndex));
        return layoutNodePositions(next);
      });
      return;
    }

    if (active.id !== over.id) {
      setNodes((items) => {
        const oldIndex = items.findIndex((n) => n.id === active.id);
        const newIndex = items.findIndex((n) => n.id === over.id);
        if (oldIndex < 0 || newIndex < 0) {
          return items;
        }
        return layoutNodePositions(arrayMove(items, oldIndex, newIndex));
      });
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (name.trim().length < 3) {
      setErrorMessage('Agent name must be at least 3 characters.');
      setIsLoading(false);
      return;
    }

    const pos = parseFloat(positionSize);
    const sl = parseFloat(stopLossPct);
    if (Number.isNaN(pos) || pos <= 0) {
      setErrorMessage('Position size must be a number greater than 0.');
      setIsLoading(false);
      return;
    }
    if (Number.isNaN(sl) || sl < 0 || sl > 100) {
      setErrorMessage('Stop loss must be between 0 and 100.');
      setIsLoading(false);
      return;
    }

    try {
      const graphPayload =
        nodes.length > 0
          ? JSON.stringify({
              nodes,
              edges,
            })
          : undefined;

      const agent = await deployAgent({
        name: name.trim(),
        strategy_type: strategyType,
        token_pair: tokenPair,
        trigger: trigger.trim(),
        position_size: pos,
        stop_loss_pct: sl,
        ...(graphPayload ? { strategy_graph: graphPayload } : {}),
      });
      setDeployedAgent(agent);
      setSuccessMessage(
        `Agent "${agent.name}" deployed successfully. It will start paper trading within 60 seconds.`
      );
      onAgentDeployed?.(agent);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deploy agent';
      setErrorMessage(message);
      console.error('Deploy error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const paletteByCategory = useMemo(() => {
    const groups = new Map<string, typeof PALETTE_BLOCKS>();
    for (const b of PALETTE_BLOCKS) {
      const list = groups.get(b.category) ?? [];
      list.push(b);
      groups.set(b.category, list);
    }
    return Array.from(groups.entries());
  }, []);

  return (
    <form onSubmit={handleDeploy} className="space-y-6">
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{successMessage}</p>
              {deployedAgent && (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Agent ID: <code className="font-mono">{deployedAgent.id}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-900 dark:text-red-200">{errorMessage}</p>
          </div>
        </div>
      )}

      <Card className="border-gray-200/80 dark:border-gray-800/80">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg text-foreground">Agent settings</CardTitle>
          <CardDescription>These fields are sent with your strategy graph to the deploy API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formFieldId}-name`}>
              Agent name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${formFieldId}-name`}
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="e.g., EMA crossover bot"
              className="h-11 rounded-xl"
              required
              minLength={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formFieldId}-strategy`}>Strategy type</Label>
              <select
                id={`${formFieldId}-strategy`}
                value={strategyType}
                onChange={(ev) => setStrategyType(ev.target.value as StrategyType)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground"
              >
                {Object.entries(SUPPORTED_STRATEGIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {key} — {value.split(' - ')[1] ?? value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formFieldId}-pair`}>Token pair</Label>
              <select
                id={`${formFieldId}-pair`}
                value={tokenPair}
                onChange={(ev) => setTokenPair(ev.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground"
              >
                {COMMON_TOKEN_PAIRS.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formFieldId}-trigger`}>Trigger condition</Label>
            <Input
              id={`${formFieldId}-trigger`}
              value={trigger}
              onChange={(ev) => setTrigger(ev.target.value)}
              placeholder="e.g., INTERVAL_24H"
              className="h-11 rounded-xl"
            />
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-xs font-medium text-muted-foreground">Examples</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {Object.entries(TRIGGER_EXAMPLES).map(([key, value]) => (
                  <li key={key}>{value}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formFieldId}-size`}>Position size (USD)</Label>
              <Input
                id={`${formFieldId}-size`}
                type="number"
                step="0.01"
                min="0.01"
                value={positionSize}
                onChange={(ev) => setPositionSize(ev.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formFieldId}-sl`}>Stop loss (%)</Label>
              <Input
                id={`${formFieldId}-sl`}
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={stopLossPct}
                onChange={(ev) => setStopLossPct(ev.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <Card className="border-gray-200/80 lg:col-span-4 dark:border-gray-800/80">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base text-foreground">Block palette</CardTitle>
              <CardDescription>Drag a block into the canvas. New blocks are not auto-wired—use a template or keep the default graph.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1">
              {paletteByCategory.map(([category, blocks]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {blocks.map((b) => (
                      <PaletteDraggable key={b.defId} defId={b.defId} label={b.label} />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
              <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={loadTemplate}>
                Load EMA template
              </Button>
              <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={clearGraph}>
                Clear graph
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-gray-200/80 lg:col-span-8 dark:border-gray-800/80">
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base text-foreground">Strategy canvas</CardTitle>
              <CardDescription>
                Reorder blocks with the handle. Removing nodes does not remove stale edges—reload the template if deploy fails validation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CanvasDropZone isEmpty={nodes.length === 0}>
                <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
                  {nodes.map((node) => (
                    <SortableNodeRow key={node.id} node={node} onRemove={removeNode} />
                  ))}
                </SortableContext>
              </CanvasDropZone>
              <p className="mt-3 text-xs text-muted-foreground">
                Edges: {edges.length} · Nodes: {nodes.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <DragOverlay dropAnimation={null}>
          {activePalette ? (
            <Card className="w-56 border-primary-200 shadow-lg dark:border-primary-900/40">
              <CardContent className="p-3">
                <span className="text-sm font-medium">{activePalette.label}</span>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Card className="border-primary-200/40 bg-primary-50/30 dark:border-primary-900/30 dark:bg-primary-950/20">
        <CardContent className="py-4">
          <p className="text-sm text-primary-800 dark:text-primary-200">
            <strong>Paper trading:</strong> Agents use simulated funds. The deploy API stores your strategy graph when nodes are present.
          </p>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isLoading}
        className="h-11 w-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 font-semibold text-white"
      >
        {isLoading ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Deploying…
          </>
        ) : (
          'Deploy agent'
        )}
      </Button>
    </form>
  );
};
