import type { Metadata } from 'next';
import Link from 'next/link';
import AutoForm from '@/components/AutoForm';
import { getData, PROGRAMS, type Program } from '@/lib/data';
import { MATRIX_PAGE, seatChanges, seatMatrix, type ChangeKind } from '@/lib/institutes';
import { fmt, hrefWith, type SearchParams } from '@/lib/url';

export const metadata: Metadata = { title: 'Seat matrix' };

const SEAT_ORDER = ['Open', 'EWS', 'OBC', 'SC', 'ST', 'Open PwD', 'EWS PwD', 'OBC PwD', 'SC PwD', 'ST PwD'];
const KIND_LABEL: Record<ChangeKind, string> = { all: 'All changes', new: 'New seats', increased: 'Increased', decreased: 'Reduced', removed: 'Removed' };

export default async function SeatMatrixPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const matrixYears = [...new Set(Array.from(d.matrix.year))].sort((a, b) => b - a);
  const year = matrixYears.includes(Number(str('year'))) ? Number(str('year')) : matrixYears[0];
  const view = str('view') === 'changes' ? 'changes' : 'matrix';
  const program = ((PROGRAMS as readonly string[]).includes(str('program')) ? str('program') : '') as Program;
  const branch = d.index.course.has(str('branch')) ? str('branch') : '';
  const state = d.states.includes(str('state')) ? str('state') : '';
  const branches = [...d.course].sort((a, b) => a.label.localeCompare(b.label));
  const canCompare = matrixYears.includes(year - 1);

  return (
    <>
      <h1>Seat matrix</h1>
      <p className="lede">
        Seats MCC put up for counselling each season, from its official seat matrices, by institute, branch, quota and category.
        Compare with the season before to see where seats were added or cut.
      </p>

      <div className="seg" role="group" aria-label="View">
        <Link href={hrefWith('/seat-matrix', sp, { view: undefined, page: undefined })} aria-current={view === 'matrix'}>Seats by institute</Link>
        <Link href={hrefWith('/seat-matrix', sp, { view: 'changes', page: undefined })} aria-current={view === 'changes'}>Changes vs last year</Link>
      </div>

      <AutoForm className="panel">
        {view === 'changes' && <input type="hidden" name="view" value="changes" />}
        <div className="fields">
          <label className="field"><span>Season</span>
            <select name="year" defaultValue={year}>{matrixYears.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
          {view === 'matrix' && <>
            <label className="field"><span>Quota</span>
              <select name="quota" defaultValue={str('quota')}><option value="">All quotas</option>
                {d.quota.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
            <label className="field"><span>Seat category</span>
              <select name="seat" defaultValue={str('seat')}><option value="">All</option>{d.acat.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label className="field"><span>Institute</span><input type="search" name="q" defaultValue={str('q')} placeholder="Name" /></label>
          </>}
          {view === 'changes' && (
            <label className="field"><span>Show</span>
              <select name="kind" defaultValue={str('kind') || 'all'}>
                {(Object.keys(KIND_LABEL) as ChangeKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
          )}
          <label className="field"><span>Branch</span>
            <select name="branch" defaultValue={branch}><option value="">All branches</option>
              {branches.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label className="field"><span>Program</span>
            <select name="program" defaultValue={program}><option value="">All programs</option>{PROGRAMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="field"><span>State</span>
            <select name="state" defaultValue={state}><option value="">All states</option>{d.states.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
      </AutoForm>

      {view === 'matrix' ? <MatrixTable sp={sp} year={year} program={program} branch={branch} state={state} /> : canCompare
        ? <ChangesTable sp={sp} year={year} program={program} branch={branch} state={state} />
        : <p className="empty">There is no earlier season in the data to compare {year} with.</p>}
    </>
  );
}

function MatrixTable({ sp, year, program, branch, state }: { sp: SearchParams; year: number; program: Program; branch: string; state: string }) {
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const page = Math.max(1, parseInt(str('page'), 10) || 1);
  const res = seatMatrix({ year, quota: str('quota'), seat: str('seat'), state, branch, program, q: str('q'), page });
  const pages = Math.max(1, Math.ceil(res.count / MATRIX_PAGE));
  return (
    <div className="tablebox">
      <table>
        <thead><tr><th>Institute</th><th>Branch</th><th>Quota</th><th className="hide-sm">By category</th><th className="num">Seats</th>
          {res.hasPrev && <th className="num">vs {year - 1}</th>}</tr></thead>
        <tbody>
          {res.rows.length ? res.rows.map((r, i) => (
            <tr key={i}>
              <td><div className="inst"><Link href={`/institutes/${r.code}`}>{r.institute}</Link></div><div className="sub">{r.state}</div></td>
              <td>{r.branch}</td>
              <td><span className="tag">{r.quota}</span></td>
              <td className="hide-sm sub">{SEAT_ORDER.filter((c) => r.byCat[c]).map((c) => `${c} ${r.byCat[c]}`).join(' · ')}</td>
              <td className="num">{r.seats}</td>
              {res.hasPrev && <td className={`num ${r.change! > 0 ? 'pos' : r.change! < 0 ? 'neg' : 'sub'}`}>{r.change! > 0 ? '+' : ''}{r.change === 0 ? '—' : r.change}</td>}
            </tr>
          )) : <tr><td colSpan={6} className="empty">No seats match these filters.</td></tr>}
        </tbody>
      </table>
      <div className="more">
        {page > 1 && <Link className="btn" href={hrefWith('/seat-matrix', sp, { page: page - 1 })}>← Previous</Link>}
        <span>{fmt(res.totalSeats)} seats in {fmt(res.count)} rows{pages > 1 ? ` · page ${page} of ${fmt(pages)}` : ''}</span>
        {page < pages && <Link className="btn" href={hrefWith('/seat-matrix', sp, { page: page + 1 })}>Next →</Link>}
      </div>
    </div>
  );
}

function ChangesTable({ sp, year, program, branch, state }: { sp: SearchParams; year: number; program: Program; branch: string; state: string }) {
  const kindParam = typeof sp.kind === 'string' ? sp.kind : 'all';
  const kind = (Object.keys(KIND_LABEL).includes(kindParam) ? kindParam : 'all') as ChangeKind;
  const limit = Math.min(3000, Math.max(100, Number(sp.limit) || 100));
  const res = seatChanges(year, { kind, state, branch, program, limit });
  const s = res.summary;
  const net = s.seatsNow - s.seatsPrev;
  return (
    <>
      <div className="stats">
        <div className="stat"><div className="v">{fmt(s.seatsNow)}</div><div className="k">seats in {year} ({net >= 0 ? '+' : ''}{fmt(net)} vs {year - 1})</div></div>
        <div className="stat"><div className="v pos">+{fmt(s.new)}</div><div className="k">in branches that had no seats in {year - 1}</div></div>
        <div className="stat"><div className="v pos">+{fmt(s.increased)}</div><div className="k">added to existing branches</div></div>
        <div className="stat"><div className="v neg">−{fmt(s.decreased)}</div><div className="k">cut from existing branches</div></div>
        <div className="stat"><div className="v neg">−{fmt(s.removed)}</div><div className="k">in branches no longer offered</div></div>
      </div>
      {!branch && res.branches.length > 0 && (
        <>
          <h2>Net change by branch</h2>
          <div className="tablebox" style={{ marginBottom: 18 }}>
            <table>
              <thead><tr><th>Branch</th><th className="num">{year - 1}</th><th className="num">{year}</th><th className="num">Change</th></tr></thead>
              <tbody>
                {res.branches.slice(0, 15).map((b) => (
                  <tr key={b.branchId}><td>{b.branch}</td><td className="num">{fmt(b.prev)}</td><td className="num">{fmt(b.now)}</td>
                    <td className={`num ${b.delta > 0 ? 'pos' : 'neg'}`}>{b.delta > 0 ? '+' : ''}{fmt(b.delta)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <h2>Institute-level changes</h2>
      <div className="tablebox">
        <table>
          <thead><tr><th>Institute</th><th>Branch</th><th>Quota</th><th className="num">{year - 1}</th><th className="num">{year}</th><th>Change</th></tr></thead>
          <tbody>
            {res.rows.length ? res.rows.map((r, i) => (
              <tr key={i}>
                <td><div className="inst"><Link href={`/institutes/${r.code}`}>{r.institute}</Link></div><div className="sub">{r.state}</div></td>
                <td>{r.branch}</td><td><span className="tag">{r.quota}</span></td>
                <td className="num">{r.prev || '—'}</td><td className="num">{r.now || '—'}</td>
                <td><span className={`pill ${r.now > r.prev ? 'b-safe' : 'b-reach'}`}>{KIND_LABEL[r.kind]} {r.now > r.prev ? '+' : '−'}{Math.abs(r.now - r.prev)}</span></td>
              </tr>
            )) : <tr><td colSpan={6} className="empty">No changes for these filters.</td></tr>}
          </tbody>
        </table>
        <div className="more">
          {res.count > res.rows.length
            ? <>Showing {fmt(res.rows.length)} of {fmt(res.count)} <Link className="btn" href={hrefWith('/seat-matrix', sp, { limit: limit + 200 })} scroll={false}>Show 200 more</Link></>
            : `${fmt(res.count)} changes`}
        </div>
      </div>
      <p className="note">Compares MCC’s opening seat matrices for each season. Seats added or removed mid-season by MCC notices are not included.</p>
    </>
  );
}
