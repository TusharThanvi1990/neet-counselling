import type { Metadata } from 'next';
import Link from 'next/link';
import ContactLines from '@/components/ContactLines';
import PageShell from '@/components/PageShell';
import { BUSINESS as B } from '@/lib/business';
import { PLANS, SEASON_END } from '@/lib/pro';

export const metadata: Metadata = { title: 'Terms and conditions' };

export default function TermsPage() {
  const until = new Date(SEASON_END).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <PageShell title="Terms and conditions" intro={`Last updated ${B.updated}`}>
      <div className="prose">
        <p>These terms apply to {B.site} (&ldquo;the site&rdquo;), run by {B.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the site or buying a plan you agree to them.</p>
        <h2>1. What the site is</h2>
        <p>An information tool for NEET PG counselling. It shows past closing ranks, seat matrices, fees, stipends, bonds and allotment lists, read from official MCC, NBEMS and state counselling documents, and predicts which seats a rank could get based on those past results.</p>
        <h2>2. No guarantee of admission</h2>
        <p>Predictions are based on previous years and rounds. Cutoffs change every year with seat counts, candidate numbers and rules. We do not promise any seat, college or outcome. Always check the official websites of MCC and your state counselling authority before choice filling, paying fees or making decisions. We are not affiliated with MCC, NBEMS, NMC, the Ministry of Health or any state counselling authority.</p>
        <h2>3. Accuracy of data</h2>
        <p>We take care to read the official documents correctly and link each figure to its source PDF, but errors can happen. If anything differs from the official document, the official document is correct. Tell us via the <Link href="/contact">contact page</Link> and we will fix it.</p>
        <h2>4. Paid plans</h2>
        <ul>
          <li>Plans: {PLANS.pass.name} (₹{PLANS.pass.price}) and {PLANS.pro.name} (₹{PLANS.pro.price}). Prices are in Indian rupees and shown on the <Link href="/pricing">pricing page</Link> before you pay. The price shown is the full amount you pay; we are not currently registered for GST, so no GST is added.</li>
          <li>Each plan is a one-time payment. Access lasts until {until}. Nothing renews automatically and you are not charged again.</li>
          <li>Access is digital and starts immediately after a successful payment. There is nothing shipped. See the <Link href="/shipping-policy">delivery policy</Link>.</li>
          <li>Payments are processed by Razorpay. We never see or store your card, UPI or bank details.</li>
          <li>Refunds follow our <Link href="/refund-policy">refund policy</Link>.</li>
        </ul>
        <h2>5. Fair use</h2>
        <p>A plan is for one person&rsquo;s own counselling and works on one device, the browser you pay in. You may not resell access, share it publicly, or copy, scrape or republish the site&rsquo;s data in bulk. We may withdraw access, without refund, from accounts that do.</p>
        <h2>6. Liability</h2>
        <p>The site is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for any loss arising from decisions made using it. Our total liability for any claim is limited to the amount you paid us.</p>
        <h2>7. Changes</h2>
        <p>We may update these terms. The date at the top shows the latest version. Changes do not reduce access you have already paid for.</p>
        <h2>8. Governing law</h2>
        <p>These terms are governed by the laws of India. Courts in {B.city} have jurisdiction.</p>
        <h2>9. Contact</h2>
        <ContactLines />
      </div>
    </PageShell>
  );
}
