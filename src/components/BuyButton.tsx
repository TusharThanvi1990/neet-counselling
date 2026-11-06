'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpOptions = {
  key: string; order_id: string; amount: number; currency: string; name: string; description: string; image?: string;
  theme: { color: string }; handler: (r: RzpResponse) => void; modal: { ondismiss: () => void };
};
declare global { interface Window { Razorpay?: new (o: RzpOptions) => { open: () => void; on: (e: string, f: (x: { error: { description: string } }) => void) => void } } }

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((ok) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => ok(true); s.onerror = () => ok(false);
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout for a plan; on success the server sets the access cookie and the page reloads unlocked. */
export default function BuyButton({ plan, label, className = 'btn primary lg block', next }: { plan: 'pass' | 'pro'; label: string; className?: string; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const buy = async () => {
    setBusy(true); setMsg('');
    try {
      if (!(await loadCheckout()) || !window.Razorpay) throw new Error('Could not load Razorpay. Check your connection and try again.');
      const r = await fetch('/api/pay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      const o = await r.json();
      if (!r.ok) throw new Error(o.error ?? 'Could not start the payment.');
      const rzp = new window.Razorpay({
        key: o.key, order_id: o.orderId, amount: o.amount, currency: o.currency,
        name: 'NEET PG Counselling', description: plan === 'pro' ? 'Pro · NEET PG 2026 season' : 'Predictor Pass · NEET PG 2026 season',
        image: '/icon.svg', theme: { color: '#0A5C55' },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (resp) => {
          setMsg('Confirming your payment…');
          const v = await fetch('/api/pay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
          const j = await v.json();
          if (!v.ok) { setMsg(`${j.error ?? 'Could not confirm.'} Payment ID: ${resp.razorpay_payment_id}. Use “Restore purchase” with it, or write to us.`); setBusy(false); return; }
          setMsg('Unlocked. Thank you!');
          if (next) router.push(next); else router.refresh();
          setBusy(false);
        },
      });
      rzp.on('payment.failed', (x) => { setMsg(x.error.description || 'Payment failed. No money was taken.'); setBusy(false); });
      rzp.open();
    } catch (e) {
      setMsg((e as Error).message); setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button type="button" className={className} disabled={busy} onClick={buy}>{busy ? 'Opening secure checkout…' : label}</button>
      {msg && <span className="note" role="status">{msg}</span>}
    </div>
  );
}
