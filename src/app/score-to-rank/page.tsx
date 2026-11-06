import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import { fmt, type SearchParams } from '@/lib/url';
import table from '../../../data/score2rank.json';

export const metadata: Metadata = {
  title: 'NEET PG Score to Rank',
  description: 'Convert a NEET PG score (out of 800) to its All India Rank, using the full NBEMS NEET PG 2025 and 2026 results.',
};

type Year = { total: number; maxScore: number; rows: [number, number, number, number][] };
const T = table as unknown as Record<string, Year>;
const YEARS = Object.keys(T).map(Number).sort((a, b) => b - a);

/** Best and worst All India Rank for a score in one year. A score nobody got takes the rank right after the next higher score. */
function lookup(year: number, score: number) {
  const t = T[year];
  if (!t) return null;
  const exact = t.rows.find((r) => r[0] === score);
  if (exact) return { lo: exact[1], hi: exact[2], n: exact[3], total: t.total };
  const above = t.rows.filter((r) => r[0] > score).at(-1);
  if (!above) return { lo: 1, hi: 1, n: 0, total: t.total };
  return { lo: above[2] + 1, hi: above[2] + 1, n: 0, total: t.total };
}

export default async function ScoreToRankPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const raw = Number(sp.score);
  const score = Number.isFinite(raw) && String(sp.score ?? '').trim() !== '' ? Math.max(-200, Math.min(800, Math.round(raw))) : null;
  const year = YEARS.includes(Number(sp.year)) ? Number(sp.year) : YEARS[0];
  const res = score == null ? null : lookup(year, score);
  const steps: number[] = [];
  for (let s = 650; s >= 150; s -= 25) steps.push(s);

  return (
    <PageShell
      title="NEET PG score to rank"
      intro={<>Your NEET PG score (out of 800) as an All India Rank, read from the full NBEMS results: {YEARS.map((y) => `${fmt(T[y].total)} candidates in ${y}`).join(' and ')}.</>}
    >
      <form className="card panel" action="/score-to-rank" method="get">
        <div className="fields">
          <label className="field"><span>Your NEET PG score</span>
            <input className="rank" name="score" type="number" min={-200} max={800} inputMode="numeric" placeholder="e.g. 450" defaultValue={score ?? ''} required /></label>
          <label className="field"><span>Exam year</span>
            <select name="year" defaultValue={year}>{YEARS.map((y) => <option key={y} value={y}>NEET PG {y}</option>)}</select></label>
          <button className="btn primary" type="submit">Find my rank</button>
        </div>
      </form>

      {res && score != null && (
        <div className="cards-2">
          <div className="big-result">
            <span className="k">Score {score} in NEET PG {year}</span>
            <span className="v">AIR {fmt(res.lo)}{res.hi !== res.lo ? `–${fmt(res.hi)}` : ''}</span>
            <span className="k">{res.n > 1 ? `${fmt(res.n)} candidates scored exactly ${score}; ties are broken by NBEMS rules, so your rank falls in this range.` : res.n === 1 ? 'One candidate had this exact score.' : 'Nobody had this exact score; this is the rank right below the next higher score.'} Top {((res.hi / res.total) * 100).toFixed(1)}% of {fmt(res.total)}.</span>
          </div>
          <div className="card panel" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: 0 }}>Same score in other years</h3>
            {YEARS.filter((y) => y !== year).map((y) => {
              const r = lookup(y, score)!;
              return <p key={y} style={{ margin: 0 }}>NEET PG {y}: <b className="mono">AIR {fmt(r.lo)}{r.hi !== r.lo ? `–${fmt(r.hi)}` : ''}</b></p>;
            })}
            <p className="note" style={{ margin: 0 }}>Paper difficulty changes every year, so the same score gives a different rank.</p>
            <div><Link className="btn accent" href={`/predictor?rank=${res.hi}`}>See colleges for AIR {fmt(res.hi)} →</Link></div>
          </div>
        </div>
      )}

      <h2>Score to rank table</h2>
      <div className="tablebox">
        <table>
          <thead><tr><th>Score</th>{YEARS.map((y) => <th key={y} className="num">AIR {y}</th>)}</tr></thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s}><td className="num" style={{ textAlign: 'left' }}><b>{s}</b></td>
                {YEARS.map((y) => { const r = lookup(y, s)!; return <td key={y} className="num">{fmt(r.lo)}{r.hi !== r.lo ? `–${fmt(r.hi)}` : ''}</td>; })}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">Source: NBEMS NEET PG result PDFs (every roll number with its score and rank). NEET PG 2024 published percentiles instead of scores, so it is not in this table.</p>
    </PageShell>
  );
}
