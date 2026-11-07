import type { Metadata } from 'next';
import Link from 'next/link';
import ContactLines from '@/components/ContactLines';
import PageShell from '@/components/PageShell';
import { BUSINESS as B } from '@/lib/business';

export const metadata: Metadata = { title: 'Contact us', description: `Contact ${B.name} for help with payments, access or the counselling data.` };

const UNLOCK_MSG: Record<string, string> = {
  used: 'That unlock link has already been used or replaced by a newer one. Message us and we will send a fresh link.',
  expired: 'That unlock link has expired (links last 24 hours). Message us and we will send a fresh one.',
  invalid: 'We could not verify that unlock link. Message us with your payment ID.',
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ unlock?: string }> }) {
  const why = UNLOCK_MSG[(await searchParams).unlock ?? ''];
  return (
    <PageShell title="Contact us" intro="Questions about a payment, your access or a closing rank that looks wrong? Reach us directly.">
      {why && <p className="card panel" role="alert" style={{ margin: '0 0 20px' }}><b>{why}</b></p>}
      <div className="cards-2">
        <div className="card panel">
          <h3 style={{ margin: 0 }}>Reach us</h3>
          <ContactLines />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="btn primary" href={B.whatsapp} target="_blank" rel="noopener">Message on WhatsApp</a>
            <a className="btn" href={B.phoneHref}>Call {B.phone}</a>
          </div>
        </div>
        <div className="card panel prose">
          <h3 style={{ margin: 0 }}>Payment problems</h3>
          <p style={{ margin: 0 }}>If money was debited but your plan did not unlock, send us the payment ID from your Razorpay receipt (it starts with <span className="mono">pay_</span>). We will check it with Razorpay and send you a link that unlocks your device.</p>
          <p style={{ margin: 0 }}>We reply within one working day. See the <Link href="/refund-policy">refund policy</Link> for refunds.</p>
        </div>
      </div>
    </PageShell>
  );
}
