'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Unlock a purchase on a new device with the Razorpay payment ID plus the mobile number used at checkout. */
export default function RestoreForm() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="fields" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg('');
      const r = await fetch('/api/pay/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: id, phone }) });
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      if (!r.ok) { setMsg(j.error ?? 'Could not restore.'); return; }
      setMsg(`Restored: ${j.plan === 'pro' ? 'Pro' : 'Predictor Pass'} is active on this device.`);
      router.refresh();
    }}>
      <label className="field" style={{ flex: '1 1 240px' }}><span>Razorpay payment ID</span>
        <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="pay_XXXXXXXXXXXXXX" required /></label>
      <label className="field" style={{ flex: '1 1 200px' }}><span>Mobile number used at checkout</span>
        <input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" required /></label>
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Restore purchase'}</button>
      {msg && <span className="note" role="status" style={{ flexBasis: '100%' }}>{msg}</span>}
    </form>
  );
}
