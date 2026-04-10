import { genPageMetadata } from '@/app/seo';
import { DashboardShell } from '@/components/dashboard/shell';

export const metadata = genPageMetadata({
  title: 'Dashboard',
  description:
    'A compact, glassmorphic trading dashboard with staking insights, token rankings, and quick exchange actions.',
});

export default function DashboardPage() {
  return <DashboardShell />;
}
