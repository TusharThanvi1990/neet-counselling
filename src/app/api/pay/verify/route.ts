import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, cookieOptions, SEASON_END, signAccess } from '@/lib/pro';
import { checkoutSignatureOk, planForPayment } from '@/lib/razorpay';

/** POST the Checkout handler's {razorpay_order_id, razorpay_payment_id, razorpay_signature} → unlock this browser. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const orderId = String(b.razorpay_order_id ?? ''), paymentId = String(b.razorpay_payment_id ?? ''), sig = String(b.razorpay_signature ?? '');
  if (!orderId || !paymentId || !sig || !checkoutSignatureOk(orderId, paymentId, sig)) {
    return NextResponse.json({ error: 'Payment could not be verified.' }, { status: 400 });
  }
  try {
    const found = await planForPayment(paymentId);
    if (!found || found.payment.order_id !== orderId) return NextResponse.json({ error: 'Payment not completed.' }, { status: 402 });
    const res = NextResponse.json({ ok: true, plan: found.plan, paymentId });
    res.cookies.set(COOKIE, signAccess({ plan: found.plan, paymentId, until: SEASON_END }), cookieOptions());
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
