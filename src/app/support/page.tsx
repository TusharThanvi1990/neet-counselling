import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import SupportTools from '@/components/SupportTools';

export const metadata: Metadata = { title: 'Support tools', robots: { index: false, follow: false } };

/** Staff page: look up a purchase and send the buyer a single-use unlock link. Protected by ADMIN_KEY. */
export default function SupportPage() {
  return (
    <PageShell title="Support tools" intro="When a buyer has paid but lost access (cleared browser, new phone, tab closed during payment), look up their payment and send them a one-time unlock link.">
      <SupportTools />
    </PageShell>
  );
}
