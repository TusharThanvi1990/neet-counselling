import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { getData } from '@/lib/data';
import { eligibility, MBBS_UNIS, MINORITIES, parseBackground, VERDICT_LABEL, type Verdict } from '@/lib/eligibility';
import { STATE_NAMES } from '@/lib/query';
import type { SearchParams } from '@/lib/url';

export const metadata: Metadata = {
  title: 'NEET PG Quota Eligibility Checker',
  description: 'Which NEET PG counsellings and quotas you can apply for: MCC All India, deemed, DNB, central universities and every state quota, from your domicile and MBBS state.',
};

const CLS: Record<Verdict, string> = { yes: 'yes', likely: 'yes', check: 'maybe', no: 'no' };

export default async function EligibilityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const b = parseBackground(sp);
  const asked = !!(b.domicile || b.mbbsState);
  const res = asked ? eligibility(b) : null;
  const states = [...new Set([...STATE_NAMES, ...d.states])].filter(Boolean).sort();
  const predictorHref = res ? `/predictor?quotas=1&${res.usable.map((q) => `quota=${encodeURIComponent(q)}`).join('&')}` : '/predictor';

  return (
    <PageShell
      title="Quota eligibility checker"
      intro="Tell us where you are domiciled and where you did MBBS. We list every counselling and quota you can apply for, and send them straight to the college predictor."
    >
      <form className="card panel" action="/eligibility" method="get">
        <div className="fields">
          <label className="field"><span>State of domicile</span>
            <select name="domicile" defaultValue={b.domicile} required><option value="">Choose…</option>{states.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>State where you did MBBS</span>
            <select name="mbbs" defaultValue={b.mbbsState} required><option value="">Choose…</option>{states.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>MBBS university</span>
            <select name="uni" defaultValue={b.uni}>{MBBS_UNIS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
          <label className="field"><span>Minority community</span>
            <select name="minority" defaultValue={b.minority}>{MINORITIES.map((m) => <option key={m} value={m}>{m || 'None'}</option>)}</select></label>
          <label className="field"><span>In state government service in</span>
            <select name="service" defaultValue={b.inService}><option value="">Not in service</option>{STATE_NAMES.slice().sort().map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="quotas">
          <label className="check"><input type="checkbox" name="nri" value="1" defaultChecked={b.nri} /> NRI or NRI-sponsored</label>
          <label className="check"><input type="checkbox" name="afms" value="1" defaultChecked={b.afms} /> Armed Forces Medical Services candidate</label>
        </div>
        <div><button className="btn primary" type="submit">Check my eligibility</button></div>
      </form>

      {res && (
        <>
          <div className="toolbar" style={{ marginTop: 0, marginBottom: 8 }}>
            <Link className="btn accent" href={predictorHref}>Predict colleges with these {res.usable.length} quotas →</Link>
            <span className="note">Uses the quotas marked Eligible or Likely eligible.</span>
          </div>

          <h2>MCC counselling (All India)</h2>
          <div className="tablebox">
            <table>
              <thead><tr><th>Quota</th><th>Eligibility</th><th>Why</th></tr></thead>
              <tbody>
                {res.mccRows.map((r) => (
                  <tr key={r.quotaId}><td><b>{r.quota}</b></td><td className={CLS[r.verdict]}>{VERDICT_LABEL[r.verdict]}</td><td className="sub">{r.why}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>State counselling</h2>
          <p className="note" style={{ marginTop: 0 }}>Each state sets its own domicile rules, so state answers are a first check. Confirm with that state’s information brochure before you register.</p>
          <div className="tablebox">
            <table>
              <thead><tr><th>State · quota</th><th>Eligibility</th><th>Why</th></tr></thead>
              <tbody>
                {res.stateRows.filter((s) => s.best !== 'no').flatMap((s) => s.rows.filter((r) => r.verdict !== 'no').map((r) => (
                  <tr key={r.quotaId}><td><b>{s.state}</b><div className="sub">{r.quota.replace(`${s.state} `, '')}</div></td>
                    <td className={CLS[r.verdict]}>{VERDICT_LABEL[r.verdict]}</td><td className="sub">{r.why}</td></tr>
                )))}
              </tbody>
            </table>
          </div>
          <p className="note">Not shown: {res.stateRows.flatMap((s) => s.rows).filter((r) => r.verdict === 'no').length} state quotas you are not eligible for (other states’ domicile, in-service and NRI seats).</p>
        </>
      )}
    </PageShell>
  );
}
