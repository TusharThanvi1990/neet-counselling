import type { Metadata } from 'next';
import Link from 'next/link';
import ContactLines from '@/components/ContactLines';
import PageShell from '@/components/PageShell';
import { BUSINESS as B } from '@/lib/business';

export const metadata: Metadata = { title: 'Contact us', description: `Contact ${B.name} for help with payments, access or the counselling data.` };

export default function ContactPage() {
  return (
    <PageShell title="Contact us" intro="Questions about a payment, your access or a closing rank that looks wrong? Reach us directly.">
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
          <p style={{ margin: 0 }}>If money was debited but your plan did not unlock, send us the payment ID from your Razorpay receipt (it starts with <span className="mono">pay_</span>). You can also unlock it yourself on the <Link href="/pricing">pricing page</Link> under &ldquo;Bought on another device?&rdquo;.</p>
          <p style={{ margin: 0 }}>We reply within one working day. See the <Link href="/refund-policy">refund policy</Link> for refunds.</p>
        </div>
      </div>
    </PageShell>
  );
}
