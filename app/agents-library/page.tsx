import { genPageMetadata } from '@/app/seo';
import { AgentsLibraryShell } from '@/components/dashboard/agents-library-shell';

export const metadata = genPageMetadata({
  title: "Agent's library",
  description: 'View and open saved trading agent drafts from the agent builder.',
});

export default function AgentsLibraryPage() {
  return <AgentsLibraryShell />;
}
