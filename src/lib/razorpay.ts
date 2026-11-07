/** Minimal Razorpay REST client (orders, payments) and signature checks. Server only. */
import crypto from 'node:crypto';
import { PLANS, type PlanId } from './pro';

const API = 'https://api.razorpay.com/v1';

async function rzp<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET', cache: 'no-store',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.description ?? `Razorpay ${res.status}`);
  return json as T;
}

export type Order = { id: string; amount: number; currency: string; status: string; notes: Record<string, string> };
export type Payment = { id: string; order_id: string; amount: number; status: string; email?: string; contact?: string; notes?: Record<string, string> | unknown[] };

export const createOrder = (plan: PlanId) =>
  rzp<Order>('/orders', { method: 'POST', body: { amount: PLANS[plan].price * 100, currency: 'INR', receipt: `${plan}-${Date.now()}`, notes: { plan, product: 'neetpgcounselling.in NEET PG 2026' } } });

export const getOrder = (id: string) => rzp<Order>(`/orders/${encodeURIComponent(id)}`);
export const getPayment = (id: string) => rzp<Payment>(`/payments/${encodeURIComponent(id)}`);

/** Notes on a payment as an object (Razorpay returns [] when there are none). */
export const paymentNotes = (p: Payment): Record<string, string> => (p.notes && !Array.isArray(p.notes) ? (p.notes as Record<string, string>) : {});

/** Replace a payment's notes. We keep the extra-device counter here, so no database is needed. */
export const setPaymentNotes = (id: string, notes: Record<string, string>) =>
  rzp<Payment>(`/payments/${encodeURIComponent(id)}`, { method: 'PATCH', body: { notes } });

/** Extra devices a purchase can be unlocked on with the payment ID (besides the one it was bought on). */
export const MAX_RESTORES = 2;
export const restoresUsed = (p: Payment) => Number(paymentNotes(p).restores) || 0;

/** Last 10 digits of a phone number, so +91 98…, 098… and 98… all compare equal. */
export const phoneKey = (s: string | undefined) => String(s ?? '').replace(/\D/g, '').slice(-10);

const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Checkout handler signature: HMAC-SHA256(order_id|payment_id, key secret). */
export const checkoutSignatureOk = (orderId: string, paymentId: string, sig: string) =>
  eq(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET ?? '').update(`${orderId}|${paymentId}`).digest('hex'), sig);

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). */
export const webhookSignatureOk = (raw: string, sig: string) =>
  !!process.env.RAZORPAY_WEBHOOK_SECRET && eq(crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'), sig);

/** Which plan a paid payment bought, or null if it is not a paid, matching purchase. */
export async function planForPayment(paymentId: string): Promise<{ plan: PlanId; payment: Payment } | null> {
  const payment = await getPayment(paymentId);
  if (payment.status !== 'captured' && payment.status !== 'authorized') return null;
  const order = await getOrder(payment.order_id);
  const plan = order.notes?.plan as PlanId;
  if (!(plan in PLANS) || payment.amount < PLANS[plan].price * 100) return null;
  return { plan, payment };
}
