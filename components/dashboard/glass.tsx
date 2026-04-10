import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export const GlassCard = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200/70 bg-white/70 shadow-sm backdrop-blur-lg',
        'dark:border-gray-800/60 dark:bg-gray-950/40',
        className,
      )}
    >
      {children}
    </div>
  );
};

