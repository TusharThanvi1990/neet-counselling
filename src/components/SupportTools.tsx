'use client';

import { useState } from 'react';

type Info = { paymentId: string; status: string; plan: string; paid: boolean; amount: number; contact: string; email: string; linksMade: number; linksUsed: number; link: string; hours: number };

/** Support tool: look up a purchase and create a single-use unlock link for the buyer. */
export default function SupportTools() {
  const [key, setKey] = useState('');
  const [id, setId] = useState('');
  const [info, setInfo] = useState<Info | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const call = async (link: boolean) => {
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, paymentId: id, link }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error ?? 'Failed.'); if (!link) setInfo(null); return; }
    setInfo(j);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(info!.link); setMsg('Link copied.'); } catch { setMsg('Select the link and copy it.'); } };
  return (
    <div className="card panel" style={{ maxWidth: 720 }}>
      <form className="fields" onSubmit={(e) => { e.preventDefault(); call(false); }}>
        <label className="field" style={{ flex: '1 1 200px' }}><span>Support password</span>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} required autoComplete="current-password" /></label>
        <label className="field" style={{ flex: '1 1 220px' }}><span>Payment ID</span>
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="pay_…" required /></label>
        <button className="btn" type="submit" disabled={busy}>Look up</button>
      </form>
      {info && (
        <div className="tablebox"><table><tbody>
          <tr><td>Plan</td><td>{info.plan} · ₹{info.amount} · {info.status}{!info.paid && ' (not a completed purchase)'}</td></tr>
          <tr><td>Buyer</td><td>{info.contact} {info.email && `· ${info.email}`}</td></tr>
          <tr><td>Unlock links</td><td>{info.linksMade} made · {info.linksUsed ? `link #${info.linksUsed} used` : 'none used'}</td></tr>
        </tbody></table></div>
      )}
      {info?.paid && <p className="note" style={{ margin: 0 }}>Check the buyer is who they say (the mobile number above should match theirs). The link unlocks one device, works once, and expires in {info.hours} hours. Making a new link cancels any unused earlier one.</p>}
      {info?.paid && <button className="btn primary" type="button" disabled={busy} onClick={() => call(true)}>Create unlock link</button>}
      {info?.link && (
        <div className="fields">
          <input type="text" readOnly value={info.link} onFocus={(e) => e.target.select()} style={{ flex: '1 1 400px' }} aria-label="Unlock link" />
          <button className="btn" type="button" onClick={copy}>Copy</button>
        </div>
      )}
      {msg && <p className="note" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  );
}
