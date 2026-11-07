import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, cookieOptions, readUnlock, SEASON_END, signAccess } from '@/lib/pro';
import { getPayment, paymentNotes, planForPayment, setPaymentNotes } from '@/lib/razorpay';

/** GET ?t=… → open a support unlock link: unlocks this browser once, then the link stops working. */
export async function GET(req: NextRequest) {
  const fail = (why: string) => NextResponse.redirect(new URL(`/contact?unlock=${why}`, req.nextUrl.origin));
  const u = readUnlock(req.nextUrl.searchParams.get('t'));
  if (!u) return fail('expired');
  try {
    const found = await planForPayment(u.p);
    if (!found) return fail('invalid');
    const notes = paymentNotes(await getPayment(u.p));
    // Only the newest link works, and only once.
    if (Number(notes.links) !== u.n || (Number(notes.used) || 0) >= u.n) return fail('used');
    await setPaymentNotes(u.p, { ...notes, used: String(u.n) });
    const res = NextResponse.redirect(new URL('/pricing?unlocked=1', req.nextUrl.origin));
    res.cookies.set(COOKIE, signAccess({ plan: found.plan, paymentId: u.p, until: SEASON_END }), cookieOptions());
    return res;
  } catch {
    return fail('invalid');
  }
}
