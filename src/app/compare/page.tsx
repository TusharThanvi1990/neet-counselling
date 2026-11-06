import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { getData } from '@/lib/data';
import { instituteDetail } from '@/lib/institutes';
import { fmt, type SearchParams } from '@/lib/url';
import bond from '../../../data/bond2025.json';

export const metadata: Metadata = {
  title: 'Compare NEET PG Colleges',
  description: 'Compare up to four NEET PG colleges side by side: closing ranks, seats, fees, stipend, hostel and service bond.',
};

const MAX = 4;
const rupees = (n: number | null | undefined) => (n == null ? '—' : `₹${fmt(n)}`);
const yesNo = (b: boolean | null | undefined) => (b == null ? '—' : b ? 'Yes' : 'No');

export default async function ComparePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const raw = ([] as string[]).concat(sp.c ?? []).map((s) => s.match(/\d{6}/)?.[0]).filter((s): s is string => !!s);
  const codes = [...new Set(raw)].slice(0, MAX);
  const insts = codes.map((c) => instituteDetail(c)).filter((x): x is NonNullable<typeof x> => !!x);
  const latest = Math.max(...d.years);
  const closeYear = insts[0]?.years.filter((y) => insts.some((i) => i.programs.some((p) => p.closing[i.years.indexOf(y)] != null))).at(-1);

  // Branch rows: every branch + quota any compared college has, with its latest closing rank and seats per college.
  const rows = new Map<string, { branch: string; quota: string; cells: { close: number | null; seats: number | null }[] }>();
  insts.forEach((inst, k) => {
    const yc = closeYear ? inst.years.indexOf(closeYear) : -1, ys = inst.years.indexOf(latest);
    for (const p of inst.programs) {
      const key = `${p.branch}|${p.quota}`;
      let r = rows.get(key);
      if (!r) rows.set(key, (r = { branch: p.branch, quota: p.quota, cells: insts.map(() => ({ close: null, seats: null })) }));
      r.cells[k] = { close: yc >= 0 ? p.closing[yc] : null, seats: ys >= 0 ? p.seats[ys] : null };
    }
  });
  const branchRows = [...rows.values()].filter((r) => insts.length < 2 || r.cells.filter((c) => c.close != null || c.seats != null).length >= 2 || insts.length === 1);
  const otherRows = [...rows.values()].length - branchRows.length;

  const bondFor = (state: string, type: string) => {
    if (!type.includes('Government')) return null;
    return (bond.states as { state: string; service: string; penalty: string }[]).find((b) => b.state === state) ?? null;
  };
  const seatsTotal = (inst: (typeof insts)[number]) => {
    const ys = inst.years.indexOf(latest);
    return ys < 0 ? null : inst.programs.reduce((s, p) => s + (p.seats[ys] ?? 0), 0);
  };

  const options = d.codes.map((c) => `${c.code} · ${c.name}${c.state ? `, ${c.state}` : ''}`);

  return (
    <PageShell
      title="Compare colleges"
      intro="Put up to four colleges side by side: closing ranks for the branches they share, seats, fees, stipend, hostel and the state’s service bond."
      crumb={{ href: '/institutes', label: 'Colleges' }}
    >
      <form className="card panel no-print" action="/compare" method="get">
        <div className="fields">
          {Array.from({ length: MAX }, (_, i) => {
            const inst = insts[i];
            return (
              <label key={i} className="field" style={{ flex: '1 1 240px' }}><span>College {i + 1}</span>
                <input type="search" name="c" list="inst-list" placeholder="Type a name or MCC code" defaultValue={inst ? `${inst.code} · ${inst.name}` : ''} /></label>
            );
          })}
          <button className="btn primary" type="submit">Compare</button>
        </div>
        <datalist id="inst-list">{options.map((o) => <option key={o} value={o} />)}</datalist>
      </form>

      {insts.length === 0 ? (
        <div className="card empty">Pick two to four colleges above. You can also start from any college page with “Compare with others”.</div>
      ) : (
        <>
          <h2>At a glance</h2>
          <div className="tablebox">
            <table className="compare-table">
              <thead><tr><th />{insts.map((i) => <th key={i.code}><Link href={`/institutes/${i.code}`}>{i.name}</Link></th>)}</tr></thead>
              <tbody>
                <tr><td>State</td>{insts.map((i) => <td key={i.code}>{i.state || '—'}</td>)}</tr>
                <tr><td>Type</td>{insts.map((i) => <td key={i.code}>{i.type}</td>)}</tr>
                <tr><td>University</td>{insts.map((i) => <td key={i.code}>{i.profile?.university ?? '—'}</td>)}</tr>
                <tr><td>Seats {latest} (MCC)</td>{insts.map((i) => <td key={i.code} className="mono">{seatsTotal(i) ?? '—'}</td>)}</tr>
                <tr><td>Fee, year 1</td>{insts.map((i) => <td key={i.code} className="mono">{rupees(i.profile?.feeY1 ?? i.profile?.annualFee)}</td>)}</tr>
                <tr><td>Stipend, year 1</td>{insts.map((i) => <td key={i.code} className="mono">{rupees(i.profile?.stipendY1)}</td>)}</tr>
                <tr><td>Hostel (men / women)</td>{insts.map((i) => <td key={i.code}>{yesNo(i.profile?.hostelMale)} / {yesNo(i.profile?.hostelFemale)}</td>)}</tr>
                <tr><td>Forfeited on resigning later</td>{insts.map((i) => <td key={i.code} className="mono">{rupees(i.profile?.forfeitOnResign)}</td>)}</tr>
                <tr><td>State service bond (state quota)</td>{insts.map((i) => {
                  const b = bondFor(i.state, i.type);
                  return <td key={i.code} style={{ fontSize: 13 }}>{b ? <><b>{b.penalty}</b><div className="sub">{b.service}</div></> : <span className="no">None recorded</span>}</td>;
                })}</tr>
              </tbody>
            </table>
          </div>
          <p className="note">Fee and stipend as declared to MCC; bond terms from each state’s counselling brochure and apply to state-quota seats in government colleges.</p>

          <h2>Closing ranks{closeYear ? ` ${closeYear}` : ''} and seats by branch</h2>
          <p className="note" style={{ marginTop: 0 }}>Open seats, MCC Rounds 1–3.{insts.length > 1 && otherRows > 0 ? ` Showing branches at least two of these colleges offer (${otherRows} more offered by one only).` : ''}</p>
          <div className="tablebox">
            <table className="compare-table">
              <thead><tr><th>Branch · quota</th>{insts.map((i) => <th key={i.code} className="num">{i.name}</th>)}</tr></thead>
              <tbody>
                {branchRows.length ? branchRows.map((r) => {
                  const best = Math.max(...r.cells.map((c) => c.close ?? -1));
                  return (
                    <tr key={r.branch + r.quota}>
                      <td><b>{r.branch}</b><div className="sub">{r.quota}</div></td>
                      {r.cells.map((c, k) => (
                        <td key={k} className="num">
                          {c.close != null ? <span className={c.close === best && insts.length > 1 ? 'pos' : undefined}>{fmt(c.close)}</span> : '—'}
                          <div className="sub">{c.seats != null ? `${c.seats} seat${c.seats === 1 ? '' : 's'}` : ''}</div>
                        </td>
                      ))}
                    </tr>
                  );
                }) : <tr><td colSpan={insts.length + 1} className="empty">These colleges share no branch.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="note">Highlighted: the most lenient closing rank (easiest to get) among the compared colleges.</p>
        </>
      )}
    </PageShell>
  );
}
