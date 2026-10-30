/**
 * Any MCC PG seat-matrix PDF (2023–2026 layouts) → rows of {code, institute, state, branch, quota, category, seats}.
 *
 * Layouts differ by year and file: some have one column per seat category (Open, Open PwD, …), some a
 * single Category column (“OP NO”, “BC PH”), and the 2023 deemed matrix only a total. Columns are found
 * by header name and matched to data pages by x-position (header pages can carry spacer columns).
 * Every institute name ends in its MCC institute code, e.g. “…, MUMBAI(700310)”, which is the stable key.
 *
 * Usage: tsx pipeline/extract-seatmatrix.ts <pdf> <out.json> --year 2025 --kind aiq|central|deemed|dnb
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from './engine';
import { gridTable } from './grid';

const [pdf, out] = process.argv.slice(2);
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const year = Number(arg('--year')), kind = arg('--kind') ?? '';

const hkey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
// Per-category seat columns → MCC's two-letter category codes.
const WIDE: Record<string, string> = {
  open: 'OP NO', openpwd: 'OP PH', generalews: 'EW NO', generalewspwd: 'EW PH', obc: 'BC NO', obcpwd: 'BC PH',
  sc: 'SC NO', scpwd: 'SC PH', st: 'ST NO', stpwd: 'ST PH',
};
type Header = { x: Record<string, number> }; // field → x-centre on the header page

function headerFrom(cells: string[], cols: number[]): Header | null {
  const h = cells.map(hkey).map((k) => (k === 'seats' ? 'totalseats' : k)); // 2025 deemed says "Seats"
  if (!h.includes('institute') || !h.includes('totalseats')) return null;
  const x: Record<string, number> = {};
  h.forEach((k, i) => { if (k) x[k] = (cols[i] + cols[i + 1]) / 2; });
  return { x };
}
const colAt = (cols: number[], x: number | undefined) =>
  x == null ? -1 : cols.findIndex((c0, i) => i + 1 < cols.length && x >= c0 && x < cols[i + 1]);

const rows: any[] = [];
let header: Header | null = null, noCode = 0;
for await (const pg of readPages(new Uint8Array(readFileSync(pdf)))) {
  const { cols, rows: grid } = gridTable(pg);
  let idx: Record<string, number> | null = null;
  for (const c of grid) {
    const h = headerFrom(c, cols);
    if (h) { header = h; idx = null; continue; }
    if (!header) continue;
    idx ??= Object.fromEntries(Object.entries(header.x).map(([k, x]) => [k, colAt(cols, x)]));
    const get = (k: string) => (idx![k] >= 0 ? (c[idx![k]] ?? '').trim() : '');
    const total = get('totalseats');
    if (!/^\d+$/.test(total)) continue;
    const institute = get('institute');
    const code = institute.match(/\((\d{6})\)\s*$/)?.[1];
    if (!code) { noCode++; continue; }
    const base = {
      code, institute: institute.replace(/\s*\(\d{6}\)\s*$/, ''), state: get('statename'),
      branch: get('program') || get('branch'), quota: get('quota'), page: pg.index + 1,
    };
    if (idx.category >= 0 && get('category')) rows.push({ ...base, category: get('category'), seats: Number(total) });
    else if (Object.keys(WIDE).some((k) => idx![k] >= 0)) {
      for (const [k, cat] of Object.entries(WIDE)) { const n = Number(get(k)); if (n > 0) rows.push({ ...base, category: cat, seats: n }); }
    } else rows.push({ ...base, category: 'OP NO', seats: Number(total) }); // total only (2023 deemed): paid seats are open seats
  }
}
const seats = rows.reduce((s, r) => s + r.seats, 0);
console.error(`${pdf.split(/[\\/]/).pop()}: rows=${rows.length} seats=${seats} institutes=${new Set(rows.map((r) => r.code)).size} rowsWithoutCode=${noCode}`);
writeFileSync(out, JSON.stringify({ source: pdf.split(/[\\/]/).pop(), year, kind, extractedAt: new Date().toISOString(), rows }));
