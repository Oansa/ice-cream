'use client';

import { cn } from '@/lib/utils';
import { KrakenSpotPricesCard } from '@/components/dashboard/KrakenSpotPricesCard';
import { OnChainAgentsList } from '@/components/dashboard/OnChainAgentsList';

export const RightPanel = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <OnChainAgentsList />
      <KrakenSpotPricesCard />
    </div>
  );
};
