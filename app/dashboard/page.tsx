import { genPageMetadata } from '@/app/seo';
import { DashboardShell } from '@/components/dashboard/shell';

export const metadata = genPageMetadata({
  title: 'Dashboard',
  description:
    'Monitor running AI trading agents, P&L, and wallet balance in one place.',
});

export default function DashboardPage() {
  return <DashboardShell />;
}
