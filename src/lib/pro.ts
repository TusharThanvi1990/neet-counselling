/**
 * Paid plans and access. No accounts yet: a successful Razorpay payment sets a signed, httpOnly cookie
 * (plan + payment id + expiry). On another device the buyer restores it with the Razorpay payment id.
 * The paywall is only active when PAYWALL=1 and Razorpay keys are set, so the site stays fully open until launch.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export type PlanId = 'pass' | 'pro';
export type Access = { plan: 'free' | PlanId; paymentId?: string; until?: string; open?: boolean };

export const SEASON_END = '2027-03-31T23:59:59+05:30';
export const FREE_RESULTS = 25;

export const PLANS: Record<PlanId, { id: PlanId; name: string; price: number; was: number; blurb: string; features: string[] }> = {
  pass: {
    id: 'pass', name: 'Predictor Pass', price: 399, was: 799, blurb: 'Every college your rank can get.',
    features: ['All predictor matches, not just the top 25', 'MCC + every state counselling', 'Max-fee and state filters', 'Valid till NEET PG 2026 counselling ends'],
  },
  pro: {
    id: 'pro', name: 'Pro', price: 999, was: 2199, blurb: 'Everything, for the whole season.',
    features: ['Everything in Predictor Pass', 'Allotment lists: who got which seat, every round', 'Rank Scan and seat increase', 'Compare colleges side by side', 'Smart choice list with PDF export', 'Valid till NEET PG 2026 counselling ends'],
  },
};

export const COOKIE = 'ngpc_access';
export const paywallOn = () => process.env.PAYWALL === '1' && !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
const secret = () => process.env.ACCESS_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const mac = (s: string) => crypto.createHmac('sha256', secret()).update(s).digest('base64url');

export function signAccess(a: { plan: PlanId; paymentId: string; until: string }) {
  const body = b64(JSON.stringify(a));
  return `${body}.${mac(body)}`;
}

export function readAccess(token: string | undefined): Access {
  if (!token || !secret()) return { plan: 'free' };
  const [body, sig] = token.split('.');
  if (!body || !sig) return { plan: 'free' };
  const want = mac(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return { plan: 'free' };
  try {
    const a = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!(a.plan in PLANS) || Date.parse(a.until) < Date.now()) return { plan: 'free' };
    return a;
  } catch { return { plan: 'free' }; }
}

/** The viewer's access. With the paywall off everyone gets everything. */
export async function getAccess(): Promise<Access> {
  if (!paywallOn()) return { plan: 'pro', open: true };
  return readAccess((await cookies()).get(COOKIE)?.value);
}

export const can = (a: Access, need: PlanId) => (need === 'pass' ? a.plan !== 'free' : a.plan === 'pro');

export const cookieOptions = () => ({
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/',
  maxAge: Math.max(60, Math.floor((Date.parse(SEASON_END) - Date.now()) / 1000)),
});
