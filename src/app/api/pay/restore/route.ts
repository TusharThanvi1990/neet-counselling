import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, cookieOptions, getAccess, SEASON_END, signAccess } from '@/lib/pro';
import { MAX_RESTORES, paymentNotes, phoneKey, planForPayment, restoresUsed, setPaymentNotes } from '@/lib/razorpay';

const NOT_FOUND = 'No purchase found for that payment ID and mobile number. Use the number you entered at checkout.';

/**
 * POST {paymentId: "pay_…", phone} → unlock this browser for a purchase made elsewhere.
 * Needs the mobile number given at checkout, and each purchase can be unlocked on at most MAX_RESTORES
 * extra devices. The count is stored in the Razorpay payment's notes (support can reset it at /support).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.paymentId ?? '').trim();
  const phone = phoneKey(body.phone);
  if (!/^pay_[A-Za-z0-9]{8,20}$/.test(id)) return NextResponse.json({ error: 'That does not look like a Razorpay payment ID (pay_…).' }, { status: 400 });
  if (phone.length !== 10) return NextResponse.json({ error: 'Enter the 10-digit mobile number you used at checkout.' }, { status: 400 });
  try {
    const found = await planForPayment(id);
    if (!found || phoneKey(found.payment.contact) !== phone) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    const res = NextResponse.json({ ok: true, plan: found.plan });
    res.cookies.set(COOKIE, signAccess({ plan: found.plan, paymentId: id, until: SEASON_END }), cookieOptions());
    // Already unlocked here with this purchase: refresh the cookie without using up a device.
    if ((await getAccess()).paymentId === id) return res;
    const used = restoresUsed(found.payment);
    if (used >= MAX_RESTORES) {
      return NextResponse.json({ error: `This purchase is already unlocked on ${MAX_RESTORES + 1} devices, the limit. If you changed phone or cleared your browser, contact support with your payment ID and we will reset it.` }, { status: 403 });
    }
    await setPaymentNotes(id, { ...paymentNotes(found.payment), restores: String(used + 1) });
    return res;
  } catch {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
}
