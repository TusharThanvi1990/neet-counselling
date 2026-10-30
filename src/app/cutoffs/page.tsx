import type { Metadata } from 'next';
import AutoForm from '@/components/AutoForm';
import { getData, latestFullYear, PROGRAMS, ROUND_SETS, yearLabel, type Program, type RoundSet } from '@/lib/data';
import { cutoffs } from '@/lib/query';
import { fmt, type SearchParams } from '@/lib/url';

export const metadata: Metadata = { title: 'Branch cutoffs' };

export default async function CutoffsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const year = d.years.includes(Number(str('year'))) ? Number(str('year')) : latestFullYear(d);
  const rounds = (['r1', 'main', 'all'].includes(str('rounds')) ? str('rounds') : 'main') as RoundSet;
  const quota = d.index.quota.has(str('quota')) ? str('quota') : 'all-india';
  const seat = d.acat.includes(str('seat')) ? str('seat') : 'Open';
  const program = ((PROGRAMS as readonly string[]).includes(str('program')) ? str('program') : '') as Program;
  const res = cutoffs(year, rounds, quota, seat, program);
  const max = Math.max(1, ...res.rows.map((r) => r.close));

  return (
    <>
      <h1>Branch-wise closing ranks</h1>
      <p className="lede">
        The range of ranks allotted to each branch for one quota and seat category, with other seasons alongside for comparison.
      </p>

      <AutoForm className="panel">
        <div className="fields">
          <label className="field"><span>Season</span>
            <select name="year" defaultValue={year}>{d.years.map((y) => <option key={y} value={y}>{yearLabel(d, y)}</option>)}</select></label>
          <label className="field"><span>Rounds</span>
            <select name="rounds" defaultValue={rounds}>{ROUND_SETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          <label className="field"><span>Quota</span>
            <select name="quota" defaultValue={quota}>{d.quota.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}</select></label>
          <label className="field"><span>Seat category</span>
            <select name="seat" defaultValue={seat}>{d.acat.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="field"><span>Program</span>
            <select name="program" defaultValue={program}><option value="">All programs</option>{PROGRAMS.map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
      </AutoForm>

      <div className="tablebox">
        <table>
          <thead>
            <tr><th>Branch</th><th className="num">First rank</th><th className="num">Closing rank</th><th className="num hide-sm">Allotted</th>
              <th className="num hide-sm">Institutes</th><th className="hide-sm">Range</th>
              {res.otherYears.map((y) => <th key={y} className="num hide-sm">{y} closing</th>)}</tr>
          </thead>
          <tbody>
            {res.rows.length ? res.rows.map((r) => (
              <tr key={r.branchId}>
                <td>{r.branch}</td>
                <td className="num">{fmt(r.open)}</td>
                <td className="num">{fmt(r.close)}</td>
                <td className="num hide-sm">{fmt(r.allotted)}</td>
                <td className="num hide-sm">{r.institutes}</td>
                <td className="hide-sm">
                  <div className="bar" title={`${fmt(r.open)} – ${fmt(r.close)}`}>
                    <i style={{ left: `${(r.open / max) * 100}%`, width: `${Math.max(0.6, ((r.close - r.open) / max) * 100)}%` }} />
                  </div>
                </td>
                {r.otherClosing.map((c, i) => <td key={i} className="num hide-sm">{c == null ? '—' : fmt(c)}</td>)}
              </tr>
            )) : <tr><td colSpan={6 + res.otherYears.length} className="empty">No allotments for this quota and seat category.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
