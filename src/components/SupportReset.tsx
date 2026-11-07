'use client';

import { useState } from 'react';

type Info = { paymentId: string; status: string; plan: string; amount: number; contact: string; email: string; extraDevices: number; limit: number; reset: boolean };

/** Support tool: look up a purchase and reset its extra-device count. */
export default function SupportReset() {
  const [key, setKey] = useState('');
  const [id, setId] = useState('');
  const [info, setInfo] = useState<Info | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const call = async (reset: boolean) => {
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, paymentId: id, reset }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setInfo(null); setMsg(j.error ?? 'Failed.'); return; }
    setInfo(j); if (reset) setMsg('Reset done. The buyer can now unlock new devices again.');
  };
  return (
    <div className="card panel" style={{ maxWidth: 640 }}>
      <form className="fields" onSubmit={(e) => { e.preventDefault(); call(false); }}>
        <label className="field" style={{ flex: '1 1 200px' }}><span>Support password</span>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} required autoComplete="current-password" /></label>
        <label className="field" style={{ flex: '1 1 220px' }}><span>Payment ID</span>
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="pay_…" required /></label>
        <button className="btn" type="submit" disabled={busy}>Look up</button>
      </form>
      {info && (
        <div className="tablebox"><table><tbody>
          <tr><td>Plan</td><td>{info.plan} · ₹{info.amount} · {info.status}</td></tr>
          <tr><td>Buyer</td><td>{info.contact} {info.email && `· ${info.email}`}</td></tr>
          <tr><td>Extra devices used</td><td><b>{info.extraDevices}</b> of {info.limit}</td></tr>
        </tbody></table></div>
      )}
      {info && <button className="btn primary" type="button" disabled={busy} onClick={() => call(true)}>Reset device count to 0</button>}
      {msg && <p className="note" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
