import { NextResponse, type NextRequest } from 'next/server';
import { PLANS, paywallOn, type PlanId } from '@/lib/pro';
import { createOrder } from '@/lib/razorpay';

/** POST {plan} → a Razorpay order for that plan (amount fixed on the server). */
export async function POST(req: NextRequest) {
  if (!paywallOn()) return NextResponse.json({ error: 'Payments are not enabled.' }, { status: 503 });
  const { plan } = await req.json().catch(() => ({}));
  if (!(plan in PLANS)) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  try {
    const o = await createOrder(plan as PlanId);
    return NextResponse.json({ orderId: o.id, amount: o.amount, currency: o.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
