import { Suspense } from 'react';
import { genPageMetadata } from '@/app/seo';
import { AgentBuilderShell } from '@/components/dashboard/agent-builder-shell';

export const metadata = genPageMetadata({
  title: 'Agent Builder',
  description:
    'Build and configure autonomous trading agents with custom strategies and risk parameters.',
});

function AgentBuilderFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading agent builder…
    </div>
  );
}

export default function AgentBuilderPage() {
  return (
    <Suspense fallback={<AgentBuilderFallback />}>
      <AgentBuilderShell />
    </Suspense>
  );
}
