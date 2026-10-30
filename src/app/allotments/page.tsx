import type { Metadata } from 'next';
import Link from 'next/link';
import AutoForm from '@/components/AutoForm';
import { getData } from '@/lib/data';
import { browse, PAGE_SIZE, parseBrowse } from '@/lib/query';
import { fmt, hrefWith, type SearchParams } from '@/lib/url';

export const metadata: Metadata = { title: 'Allotments' };

export default async function AllotmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const f = parseBrowse(sp);
  const res = browse(f);
  const round = d.rounds.find((r) => r.id === f.round)!;
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const branches = [...d.course].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>Allotment lists</h1>
      <p className="lede">
        Every allotment from MCC’s official result PDFs, searchable. Each row links to the page of the PDF it came from.
        For Rounds 2 and 3, only seats allotted in that round are listed.
      </p>

      <AutoForm className="panel">
        <div className="fields">
          <label className="field"><span>Round</span>
            <select name="round" defaultValue={f.round}>
              {[...d.rounds].reverse().map((r) => <option key={r.id} value={r.id}>{r.year} · {r.label}</option>)}
            </select></label>
          <label className="field"><span>Institute</span><input type="search" name="q" defaultValue={f.q} placeholder="Name or city" /></label>
          <label className="field"><span>Branch</span>
            <select name="branch" defaultValue={f.branch}><option value="">All branches</option>
              {branches.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label className="field"><span>Quota</span>
            <select name="quota" defaultValue={f.quota}><option value="">All quotas</option>
              {d.quota.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
          <label className="field"><span>Seat category</span>
            <select name="seat" defaultValue={f.seat}><option value="">All</option>{d.acat.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="field"><span>State</span>
            <select name="state" defaultValue={f.state}><option value="">All states</option>{d.states.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>Rank from</span><input className="short" type="number" name="min" min={1} defaultValue={f.min || ''} /></label>
          <label className="field"><span>to</span><input className="short" type="number" name="max" min={1} defaultValue={f.max || ''} /></label>
        </div>
      </AutoForm>

      <div className="tablebox">
        <table>
          <thead><tr><th className="num">Rank</th><th>Institute</th><th>Branch</th><th>Quota</th><th>Seat</th><th className="hide-sm">Candidate</th><th className="num">PDF</th></tr></thead>
          <tbody>
            {res.rows.length ? res.rows.map((r, i) => (
              <tr key={i}>
                <td className="num">{fmt(r.rank)}</td>
                <td><div className="inst">{r.institute}</div><div className="sub">{r.state}</div></td>
                <td>{r.branch}</td>
                <td><span className="tag">{r.quota}</span></td>
                <td>{r.seatCategory}</td>
                <td className="hide-sm">{r.candidateCategory}</td>
                <td className="num"><a href={r.pdf} target="_blank" rel="noopener">p.{r.page}</a></td>
              </tr>
            )) : <tr><td colSpan={7} className="empty">No allotments match these filters.</td></tr>}
          </tbody>
        </table>
        <div className="more">
          {f.page > 1 && <Link className="btn" href={hrefWith('/allotments', sp, { page: f.page - 1 })}>← Previous</Link>}
          <span>{fmt(res.total)} allotments in {round.year} {round.label}{pages > 1 ? ` · page ${f.page} of ${fmt(pages)}` : ''}</span>
          {f.page < pages && <Link className="btn" href={hrefWith('/allotments', sp, { page: f.page + 1 })}>Next →</Link>}
        </div>
      </div>
    </>
  );
}
