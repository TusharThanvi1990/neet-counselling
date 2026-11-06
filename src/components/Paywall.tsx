import Link from 'next/link';
import type { ReactNode } from 'react';
import { can, getAccess, PLANS, type PlanId } from '@/lib/pro';
import { fmt } from '@/lib/url';

/** Locked-feature card: what the plan unlocks and its price. */
export function Paywall({ need, title, text }: { need: PlanId; title: string; text: string }) {
  const p = PLANS[need];
  return (
    <div className="paywall">
      <span className="kicker">{p.name} · ₹{fmt(p.price)} for the season</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <div className="toolbar" style={{ marginTop: 4 }}>
        <Link className="btn accent lg" href={`/pricing?plan=${need}`}>Unlock for ₹{fmt(p.price)}</Link>
        <Link className="btn lg" href="/pricing">Compare plans</Link>
      </div>
    </div>
  );
}

/** Renders children only for viewers with the plan; everyone else sees the paywall. */
export default async function ProGate({ need, title, text, children }: { need: PlanId; title: string; text: string; children: ReactNode }) {
  return can(await getAccess(), need) ? <>{children}</> : <Paywall need={need} title={title} text={text} />;
}
