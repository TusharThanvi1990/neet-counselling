import type { Metadata } from 'next';
import ContactLines from '@/components/ContactLines';
import PageShell from '@/components/PageShell';
import { BUSINESS as B } from '@/lib/business';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" intro={`Last updated ${B.updated}`}>
      <div className="prose">
        <p>{B.name} runs {B.site}. This page explains what we collect and why. We collect as little as possible.</p>
        <h2>What we collect</h2>
        <ul>
          <li><b>What you type into the tools</b> (rank, category, filters). This is used only to show results and is not stored against your identity.</li>
          <li><b>Your choice lists</b> are saved in your own browser (local storage). They do not reach our servers.</li>
          <li><b>Payments.</b> When you buy a plan, Razorpay collects your payment details and contact details under <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener">its own privacy policy</a>. We receive the payment ID, amount, status and the contact details you gave Razorpay, so we can confirm the payment and help with problems. We never receive your full card, UPI or bank details.</li>
          <li><b>Access cookie.</b> After payment we set one signed cookie in your browser that records your plan and payment ID, so the site knows what to unlock.</li>
          <li><b>Server logs</b> kept by our hosting provider (IP address, browser, pages requested) for security and to keep the site running.</li>
        </ul>
        <h2>What we do not do</h2>
        <p>We do not sell or rent your data, and we do not use advertising trackers.</p>
        <h2>Who we share it with</h2>
        <p>Only the services needed to run the site: Razorpay (payments) and Vercel (hosting). We may also disclose information if the law requires it.</p>
        <h2>Your rights</h2>
        <p>You can ask us what we hold about you, ask us to correct it, or ask us to delete it, subject to records we must keep by law (such as payment records for tax). Clearing your browser&rsquo;s data removes your choice lists and access cookie; contact us with your payment ID if you lose access.</p>
        <h2>Contact</h2>
        <ContactLines />
      </div>
    </PageShell>
  );
}
