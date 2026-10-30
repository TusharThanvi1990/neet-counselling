/**
 * Any MCC PG result PDF (R1 / R2 / R3 / stray, 2023–2026 layouts) → allotments made IN THAT ROUND.
 * Later rounds repeat earlier rounds' seats in side-by-side blocks; the current round is the LAST
 * "Allotted Quota" block in the header, and a row counts only when that block holds a seat.
 * Usage: tsx scripts/extract-results.ts <pdf> <out.json> --year 2025 --round 2
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from './engine';
import { gridTable } from './grid';

const [pdf, out] = process.argv.slice(2);
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const year = Number(arg('--year')), round = arg('--round') ?? '1';

const hkey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
// A layout holds each field's x-centre (from the header page's columns); data pages map fields to
// columns by position, because header pages can carry spacer columns that data pages lack.
type Fields = 'rank' | 'quota' | 'institute' | 'course' | 'acat' | 'ccat' | 'remarks';
type Layout = Record<Fields, number>;
type IdxLayout = Record<Fields, number>;

function layoutFrom(header: string[]): IdxLayout | null {
  const h = header.map(hkey);
  const rank = h.indexOf('rank');
  const q = h.lastIndexOf('allottedquota');
  if (rank < 0 || q < 0) return null;
  const after = (name: string) => { const i = h.indexOf(name, q); return i; };
  return { rank, quota: q, institute: after('allottedinstitute'), course: after('course'), acat: after('allotedcategory'),
    ccat: after('candidatecategory'), remarks: after('remarks') };
}
const centre = (cols: number[], i: number) => (i >= 0 ? (cols[i] + cols[i + 1]) / 2 : NaN);
const colAt = (cols: number[], x: number) => (Number.isNaN(x) ? -1 : cols.findIndex((c0, i) => i + 1 < cols.length && x >= c0 && x < cols[i + 1]));

const rows: any[] = [];
let layout: Layout | null = null, pages = 0, skippedRows = 0;
const t0 = Date.now();
for await (const pg of readPages(new Uint8Array(readFileSync(pdf)))) {
  pages++;
  const { cols, rows: grid } = gridTable(pg);
  let idx: IdxLayout | null = null;
  for (const c of grid) {
    const lay = layoutFrom(c);
    if (lay) { layout = Object.fromEntries(Object.entries(lay).map(([k, i]) => [k, centre(cols, i)])) as Layout; idx = null; continue; }
    if (!layout) continue;
    idx ??= Object.fromEntries(Object.entries(layout).map(([k, x]) => [k, colAt(cols, x)])) as IdxLayout;
    if (!/^\d+$/.test(c[idx.rank] ?? '')) continue;
    const get = (i: number) => (i >= 0 ? c[i] ?? '' : '').trim();
    const quota = get(idx.quota);
    if (!quota || quota === '-') { skippedRows++; continue; } // no seat in this round (kept / exited / not upgraded)
    rows.push({ rank: Number(c[idx.rank]), quota, institute: get(idx.institute), course: get(idx.course),
      allottedCategory: get(idx.acat), candidateCategory: get(idx.ccat), remarks: get(idx.remarks), page: pg.index + 1 });
  }
  if (pg.index % 500 === 0) console.error(`${pdf.split(/[\\/]/).pop()} page ${pg.index + 1}: ${rows.length}`);
}
const unsorted = rows.filter((r, i) => i > 0 && r.rank < rows[i - 1].rank).length;
const empty = rows.filter((r) => !r.institute || !r.course).length;
console.error(`${pdf.split(/[\\/]/).pop()}: pages=${pages} allotments=${rows.length} noSeatThisRound=${skippedRows} rankOrderBreaks=${unsorted} emptyFields=${empty} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
writeFileSync(out, JSON.stringify({ source: pdf.split(/[\\/]/).pop(), year, round, extractedAt: new Date().toISOString(), rows }));
