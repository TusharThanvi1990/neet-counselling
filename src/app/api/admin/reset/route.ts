import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { PLANS } from '@/lib/pro';
import { getOrder, getPayment, MAX_RESTORES, paymentNotes, restoresUsed, setPaymentNotes } from '@/lib/razorpay';

const keyOk = (k: string) => {
  const want = process.env.ADMIN_KEY ?? '';
  if (want.length < 12) return false;
  const a = crypto.createHash('sha256').update(k).digest(), b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
};

/** POST {key, paymentId, reset?} → a purchase's device count, and optionally reset it to 0. For support staff only. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!keyOk(String(body.key ?? ''))) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: 'Wrong support password.' }, { status: 401 });
  }
  const id = String(body.paymentId ?? '').trim();
  if (!/^pay_[A-Za-z0-9]{8,20}$/.test(id)) return NextResponse.json({ error: 'Enter a payment ID (pay_…).' }, { status: 400 });
  try {
    let p = await getPayment(id);
    const order = await getOrder(p.order_id).catch(() => null);
    const plan = order?.notes?.plan as keyof typeof PLANS | undefined;
    if (body.reset) p = await setPaymentNotes(id, { ...paymentNotes(p), restores: '0' });
    return NextResponse.json({
      paymentId: id, status: p.status, plan: plan && PLANS[plan] ? PLANS[plan].name : 'unknown',
      amount: p.amount / 100, contact: p.contact ?? '', email: p.email ?? '',
      extraDevices: restoresUsed(p), limit: MAX_RESTORES, reset: !!body.reset,
    });
  } catch {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }
}
