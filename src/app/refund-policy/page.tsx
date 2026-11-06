import type { Metadata } from 'next';
import Link from 'next/link';
import ContactLines from '@/components/ContactLines';
import PageShell from '@/components/PageShell';
import { BUSINESS as B } from '@/lib/business';

export const metadata: Metadata = { title: 'Refund and cancellation policy' };

export default function RefundPage() {
  return (
    <PageShell title="Refund and cancellation policy" intro={`Last updated ${B.updated}`}>
      <div className="prose">
        <h2>No refunds</h2>
        <p>All purchases are final. Our plans give digital access that starts the moment payment succeeds, so <b>we do not offer refunds</b>, including if you change your mind, stop using the site, do not get the seat a prediction suggested, or counselling dates or rules change. Predictions are a guide based on past results, not a guarantee. Please check what each plan includes on the <Link href="/pricing">pricing page</Link> before you pay; the free tools let you try the site first.</p>
        <h2>No cancellation needed</h2>
        <p>Every plan is a one-time payment. There is no subscription, nothing renews, and you are never charged again.</p>
        <h2>Billing errors</h2>
        <p>These are not refunds, and we always put them right:</p>
        <ul>
          <li><b>Charged twice</b> for the same plan: the extra payment is returned in full.</li>
          <li><b>Money debited but access never unlocked</b>: we unlock it, or return the payment if we cannot.</li>
        </ul>
        <p>Contact us with your payment ID (it starts with <span className="mono">pay_</span> and is in your Razorpay receipt). Returned payments go back to the original payment method within 5 to 7 working days.</p>
        <h2>Payment failed but money was debited?</h2>
        <p>If a payment fails, banks usually reverse the debit automatically within 5 to 7 working days. If yours does not, contact us and we will follow it up with Razorpay.</p>
        <h2>Contact</h2>
        <ContactLines />
      </div>
    </PageShell>
  );
}
