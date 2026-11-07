import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import SupportReset from '@/components/SupportReset';

export const metadata: Metadata = { title: 'Support tools', robots: { index: false, follow: false } };

/** Staff page: reset how many extra devices a purchase has been unlocked on. Protected by ADMIN_KEY. */
export default function SupportPage() {
  return (
    <PageShell title="Support tools" intro="Look up a purchase by its payment ID and reset its device count when a buyer changes phone or clears their browser.">
      <SupportReset />
    </PageShell>
  );
}
