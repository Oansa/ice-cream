import { genPageMetadata } from '@/app/seo';
import { AgentBuilderShell } from '@/components/dashboard/agent-builder-shell';

export const metadata = genPageMetadata({
  title: 'Agent Builder',
  description:
    'Build and configure autonomous trading agents with custom strategies and risk parameters.',
});

export default function AgentBuilderPage() {
  return <AgentBuilderShell />;
}
