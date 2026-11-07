import type { Metadata } from 'next';
import Link from 'next/link';
import BuyButton from '@/components/BuyButton';
import PageShell from '@/components/PageShell';
import { FREE_RESULTS, getAccess, PLANS, paywallOn, SEASON_END } from '@/lib/pro';
import { fmt, type SearchParams } from '@/lib/url';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'NEET PG Counselling plans: free tools, Predictor Pass ₹199 and Pro ₹299 for the whole NEET PG 2026 counselling season.',
};

const ROWS: [string, boolean | string, boolean | string, boolean | string][] = [
  ['College predictor', `Top ${FREE_RESULTS} matches`, 'Every match', 'Every match'],
  ['Branch cutoffs, seat matrix, colleges & fees', true, true, true],
  ['Score to rank, quota eligibility, calendar, notices', true, true, true],
  ['MCC + every state counselling in the predictor', true, true, true],
  ['Allotment lists (who got which seat, every round)', false, false, true],
  ['Rank Scan', false, false, true],
  ['Seat increase (changes vs last year)', false, false, true],
  ['Compare colleges', false, false, true],
  ['Smart choice list + PDF export', false, false, true],
];
const cell = (v: boolean | string) => (typeof v === 'string' ? v : v ? <span className="yes">✓</span> : <span className="no">—</span>);

export default async function PricingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const a = await getAccess();
  const live = paywallOn();
  const test = (process.env.RAZORPAY_KEY_ID ?? '').startsWith('rzp_test_');
  const until = new Date(SEASON_END).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const want = sp.plan === 'pass' || sp.plan === 'pro' ? sp.plan : '';

  return (
    <PageShell title="One season, one small price" intro={<>Pay once for NEET PG 2026 counselling. No subscription, no auto-renewal. Access lasts until {until}.</>}>
      {test && live && <p className="note" style={{ marginTop: 0 }}><b>Test mode:</b> use Razorpay test cards or UPI <span className="mono">success@razorpay</span>; no real money is charged.</p>}
      {!a.open && a.plan !== 'free' && (
        <div className="big-result" style={{ marginBottom: 20 }}>
          <span className="k">Active on this device</span>
          <span className="v" style={{ fontSize: 32 }}>{PLANS[a.plan].name}</span>
          <span className="k">Payment {a.paymentId} · valid till {until}</span>
        </div>
      )}

      <div className="plans">
        <div className="plan">
          <h3>Free</h3>
          <div className="price">₹0</div>
          <p className="sub">Enough to see where you stand.</p>
          <ul className="checks">
            <li>Top {FREE_RESULTS} predictor matches</li><li>Branch cutoffs and seat matrix</li><li>Colleges, fees, stipend and bond</li><li>Score to rank and quota eligibility</li>
          </ul>
          <Link className="btn lg block" href="/predictor">Use free tools</Link>
        </div>
        {(['pass', 'pro'] as const).map((id) => {
          const p = PLANS[id], owned = !a.open && (a.plan === id || (id === 'pass' && a.plan === 'pro'));
          return (
            <div key={id} className={`plan ${id === 'pro' ? 'featured' : ''} ${want === id ? 'wanted' : ''}`}>
              {id === 'pro' && <span className="badge">Best value</span>}
              <h3>{p.name}</h3>
              <div className="price">₹{fmt(p.price)}</div>
              <p className="sub">{p.blurb} A fraction of what similar tools charge.</p>
              <ul className="checks">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {owned ? <span className="btn added lg block">✓ Active on this device</span>
                : live ? <BuyButton plan={id} label={`Get ${p.name} · ₹${fmt(p.price)}`} className={`btn ${id === 'pro' ? 'accent' : 'primary'} lg block`} />
                : <span className="btn lg block" aria-disabled="true">Free during launch</span>}
            </div>
          );
        })}
      </div>

      <p className="note">One-time payment for one device, no GST added: the price shown is exactly what you pay. Non-refundable. By paying you agree to the <Link href="/terms">terms</Link> and <Link href="/refund-policy">refund policy</Link>.</p>

      <h2>Compare plans</h2>
      <div className="tablebox">
        <table>
          <thead><tr><th>Feature</th><th className="num">Free</th><th className="num">Predictor Pass</th><th className="num">Pro</th></tr></thead>
          <tbody>{ROWS.map(([f, ...v]) => <tr key={f}><td>{f}</td>{v.map((x, i) => <td key={i} className="num">{cell(x)}</td>)}</tr>)}</tbody>
        </table>
      </div>

      <h2>Questions</h2>
      <div className="faq" style={{ margin: 0 }}>
        <details><summary>Is it a subscription?</summary><p>No. You pay once and access lasts until {until}, the end of NEET PG 2026 counselling. Nothing renews.</p></details>
        <details><summary>How do I pay?</summary><p>Through Razorpay: UPI, cards, net banking or wallets. We never see your card or bank details.</p></details>
        <details><summary>Can I upgrade from Predictor Pass to Pro later?</summary><p>Yes, buy Pro any time from this page.</p></details>
        <details><summary>Can I use it on more than one device?</summary><p>No. Each purchase unlocks one device: the browser you pay in. Pay on the phone or laptop you will use for counselling, and do not clear that browser&rsquo;s site data. If your access stops working, <Link href="/contact">contact us</Link> with your payment ID.</p></details>
        <details><summary>Is GST extra?</summary><p>No. The price shown is the full amount you pay. We are not registered for GST yet, so none is added.</p></details>
        <details><summary>Can I get a refund?</summary><p>No. Access starts the moment you pay, so all sales are final; try the free tools first. If you were charged twice or paid but nothing unlocked, <Link href="/contact">contact us</Link> and we will fix it. See the <Link href="/refund-policy">refund policy</Link>.</p></details>
        <details><summary>Why is it cheaper than other sites?</summary><p>We read every official result PDF with our own pipeline, so the data costs us little to keep up to date. You get the same closing ranks, each linked to its source page.</p></details>
      </div>
    </PageShell>
  );
}
