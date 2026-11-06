import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, cookieOptions, SEASON_END, signAccess } from '@/lib/pro';
import { planForPayment } from '@/lib/razorpay';

/** POST {paymentId: "pay_…"} → unlock this browser for a purchase made elsewhere (id is in the Razorpay receipt email). */
export async function POST(req: NextRequest) {
  const { paymentId } = await req.json().catch(() => ({}));
  const id = String(paymentId ?? '').trim();
  if (!/^pay_[A-Za-z0-9]{8,20}$/.test(id)) return NextResponse.json({ error: 'That does not look like a Razorpay payment ID (pay_…).' }, { status: 400 });
  try {
    const found = await planForPayment(id);
    if (!found) return NextResponse.json({ error: 'No completed purchase found for that payment ID.' }, { status: 404 });
    const res = NextResponse.json({ ok: true, plan: found.plan });
    res.cookies.set(COOKIE, signAccess({ plan: found.plan, paymentId: id, until: SEASON_END }), cookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: 'No completed purchase found for that payment ID.' }, { status: 404 });
  }
}
