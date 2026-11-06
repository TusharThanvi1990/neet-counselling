/**
 * Score → All India Rank table from the full NBEMS NEET PG results (data/raw/nbems/neetpg20xx_air.json,
 * roll no. → [rank, score]). Writes data/score2rank.json: per year, per score, the best and worst rank
 * printed for that score and how many candidates had it. 2024's result prints a percentile, not a score, so it is left out.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out: Record<string, { total: number; maxScore: number; rows: [number, number, number, number][] }> = {};
for (const year of [2025, 2026]) {
  const raw: Record<string, [number, number]> = JSON.parse(fs.readFileSync(path.join(root, 'data/raw/nbems', `neetpg${year}_air.json`), 'utf8'));
  const by = new Map<number, [number, number, number]>();
  for (const [rank, score] of Object.values(raw)) {
    if (!Number.isFinite(rank) || !Number.isInteger(score)) continue;
    const c = by.get(score);
    if (!c) by.set(score, [rank, rank, 1]);
    else { c[0] = Math.min(c[0], rank); c[1] = Math.max(c[1], rank); c[2]++; }
  }
  const rows = [...by].sort((a, b) => b[0] - a[0]).map(([s, [lo, hi, n]]) => [s, lo, hi, n] as [number, number, number, number]);
  out[year] = { total: Object.keys(raw).length, maxScore: rows[0][0], rows };
  console.log(year, 'candidates', out[year].total, 'scores', rows.length, 'top', rows[0], 'bottom', rows.at(-1));
}
fs.writeFileSync(path.join(root, 'data/score2rank.json'), JSON.stringify(out));
