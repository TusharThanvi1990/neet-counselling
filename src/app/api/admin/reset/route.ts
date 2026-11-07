import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { PLANS, signUnlock } from '@/lib/pro';
import { getOrder, getPayment, paymentNotes, setPaymentNotes } from '@/lib/razorpay';

const LINK_HOURS = 24;

const keyOk = (k: string) => {
  const want = process.env.ADMIN_KEY ?? '';
  if (want.length < 12) return false;
  const a = crypto.createHash('sha256').update(k).digest(), b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
};

/**
 * Support only. POST {key, paymentId, link?} → the purchase's details; with link=true also a single-use
 * unlock link (valid 24 h) to send the buyer. Making a new link cancels any earlier unused one.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!keyOk(String(body.key ?? ''))) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Wrong support password.' }, { status: 401 });
  }
  const id = String(body.paymentId ?? '').trim();
  if (!/^pay_[A-Za-z0-9]{8,20}$/.test(id)) return NextResponse.json({ error: 'Enter a payment ID (pay_…).' }, { status: 400 });
  try {
    const p = await getPayment(id);
    const order = await getOrder(p.order_id).catch(() => null);
    const plan = order?.notes?.plan as keyof typeof PLANS | undefined;
    const notes = paymentNotes(p);
    const paid = (p.status === 'captured' || p.status === 'authorized') && !!plan && plan in PLANS;
    let link = '';
    if (body.link) {
      if (!paid) return NextResponse.json({ error: 'This payment is not a completed purchase, so it cannot be unlocked.' }, { status: 400 });
      const n = (Number(notes.links) || 0) + 1;
      await setPaymentNotes(id, { ...notes, links: String(n) });
      link = `${req.nextUrl.origin}/api/pay/unlock?t=${signUnlock({ p: id, n, exp: Date.now() + LINK_HOURS * 3600e3 })}`;
    }
    return NextResponse.json({
      paymentId: id, status: p.status, plan: plan && PLANS[plan] ? PLANS[plan].name : 'unknown', paid,
      amount: p.amount / 100, contact: p.contact ?? '', email: p.email ?? '',
      linksMade: Number(notes.links) || 0, linksUsed: Number(notes.used) || 0, link, hours: LINK_HOURS,
    });
  } catch {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }
}
