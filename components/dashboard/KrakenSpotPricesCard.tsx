'use client';

import * as React from 'react';
import { Activity, RefreshCw } from 'lucide-react';

import { Button } from '@/components/shared/ui/button';
import { DASHBOARD_SURFACE } from '@/lib/dashboard-surface';
import { fetchBtcEthSolSpot, getKrakenEndpoint, type SpotMetrics } from '@/lib/krakenApi';
import { cn } from '@/lib/utils';

const formatUsd = (n: number | null) => {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n >= 1000 ? 2 : 4,
    minimumFractionDigits: 2,
  }).format(n);
};

const formatVol = (n: number | null) => {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(2)}K`;
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const KrakenSpotPricesCard = ({ className }: { className?: string }) => {
  const [rows, setRows] = React.useState<SpotMetrics[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchBtcEthSolSpot();
      setRows(next);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Kraken data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div className={cn('p-4', DASHBOARD_SURFACE, className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity className="h-4 w-4 shrink-0 text-primary-500" />
            Kraken spot
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            BTC, ETH, SOL — price &amp; 24h volume via{' '}
            <span className="font-mono text-[10px] text-muted-foreground/90">{getKrakenEndpoint()}</span>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh Kraken prices"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">Loading Kraken spot…</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/50 bg-white/40 px-3 py-2.5 dark:border-gray-800/50 dark:bg-gray-950/25"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{row.label}</p>
                <p className="text-[11px] text-muted-foreground">24h vol {formatVol(row.volume24h)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-foreground">{formatUsd(row.price)}</p>
                {row.error ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">{row.error}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {updatedAt ? (
        <p className="mt-3 text-[10px] text-muted-foreground">
          Updated {updatedAt.toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
};
