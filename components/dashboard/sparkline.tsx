'use client';

import { cn } from '@/lib/utils';

function toSparkPath(points: number[]) {
  if (points.length < 2) {
    return '';
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);

  const viewWidth = 100;
  const viewHeight = 32;
  const step = viewWidth / (points.length - 1);

  return points
    .map((value, idx) => {
      const x = idx * step;
      const normalized = (value - min) / range;
      const y = viewHeight - normalized * viewHeight;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export const Sparkline = ({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) => {
  const d = toSparkPath(points);
  return (
    <svg
      viewBox="0 0 100 32"
      aria-hidden="true"
      className={cn('h-8 w-20', className)}
    >
      <path
        d={d}
        fill="none"
        className="stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

