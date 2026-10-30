import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import Link from 'next/link';
import AutoForm from '@/components/AutoForm';
import { getData, latestFullYear, yearLabel } from '@/lib/data';
import { RANK_SCAN_MAX, rankScan } from '@/lib/query';
import { fmt, type SearchParams } from '@/lib/url';

export const metadata: Metadata = { title: 'Rank Scan' };

export default async function RankScanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const num = (k: string, dflt: number) => { const n = parseInt(String(sp[k] ?? ''), 10); return n > 0 ? n : dflt; };
  const year = d.years.includes(num('year', 0)) ? num('year', 0) : latestFullYear(d);
  const from = num('from', 5000);
  const to = Math.max(from, num('to', from + 49));
  const res = rankScan(year, from, to);
  const shownTo = from + res.rows.length - 1;

  return (
    <PageShell title="Rank Scan" intro={<>See what every rank in a range was allotted in each MCC and state counselling round: the first seat, any upgrade in later rounds, and stray-round seats. Use it to see how far down the ranks a seat went, and who moved up from it.</>}>


      <AutoForm className="panel">
        <div className="fields">
          <label className="field"><span>Season</span>
            <select name="year" defaultValue={year}>{d.years.map((y) => <option key={y} value={y}>{yearLabel(d, y)}</option>)}</select></label>
          <label className="field"><span>From rank</span><input className="rank" type="number" name="from" min={1} defaultValue={from} /></label>
          <label className="field"><span>To rank</span><input className="rank" type="number" name="to" min={1} defaultValue={to} /></label>
        </div>
        <p className="note" style={{ margin: 0 }}>Up to {RANK_SCAN_MAX} ranks at a time.</p>
      </AutoForm>

      <div className="tablebox">
        <table>
          <thead>
            <tr><th className="num">Rank</th><th className="hide-sm">Category</th>{res.rounds.map((r) => <th key={r.id}>{r.counselling}<br />{r.label}</th>)}</tr>
          </thead>
          <tbody>
            {res.rows.map((row) => (
              <tr key={row.rank}>
                <td className="num">{fmt(row.rank)}</td>
                <td className="hide-sm sub">{row.candidateCategory ?? '—'}</td>
                {row.cells.map((c, i) => (
                  <td key={i}>
                    {c ? (
                      <>
                        <div className="inst">{c.code ? <Link href={`/institutes/${c.code}`}>{c.institute}</Link> : c.institute}</div>
                        <div className="sub">{c.branch}</div>
                        <div className="sub">
                          {c.status === 'Upgraded' ? <span className="pill b-safe">Upgraded</span> : null} {c.quota} · {c.seatCategory} ·{' '}
                          <a href={c.pdf} target="_blank" rel="noopener">PDF</a>
                        </div>
                      </>
                    ) : <span className="sub">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="more">
          Ranks {fmt(from)}–{fmt(shownTo)} in {year}. A dash in a later round means no new seat in that round: the candidate kept the earlier seat, or did not take part.
        </div>
      </div>
    </PageShell>
  );
}
