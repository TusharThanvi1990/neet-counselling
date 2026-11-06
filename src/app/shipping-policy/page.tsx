import type { Metadata } from 'next';
import Link from 'next/link';
import ContactLines from '@/components/ContactLines';
import PageShell from '@/components/PageShell';
import { BUSINESS as B } from '@/lib/business';

export const metadata: Metadata = { title: 'Shipping and delivery policy' };

export default function ShippingPage() {
  return (
    <PageShell title="Shipping and delivery policy" intro={`Last updated ${B.updated}`}>
      <div className="prose">
        <p>{B.name} sells digital access only. Nothing physical is shipped, and there are no shipping charges.</p>
        <h2>How access is delivered</h2>
        <ul>
          <li>Access unlocks on {B.site} in the same browser immediately after a successful payment, usually within a few seconds.</li>
          <li>Razorpay emails a payment receipt with your payment ID. Use it on the <Link href="/pricing">pricing page</Link> to unlock the site on another device or browser.</li>
          <li>If access has not unlocked within 30 minutes of a successful payment, <Link href="/contact">contact us</Link> with your payment ID and we will sort it out within one working day.</li>
        </ul>
        <h2>Contact</h2>
        <ContactLines />
      </div>
    </PageShell>
  );
}
