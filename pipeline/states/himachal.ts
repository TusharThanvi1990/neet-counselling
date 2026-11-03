/**
 * Himachal Pradesh NEET PG state counselling (Atal Medical & Research University, amruhp.ac.in) → allotments in the
 * same shape as MCC rounds.
 *
 * AMRU's "Final Seat Allocation" lists give the state merit number and application number:
 *   Sr No | Merit No. | Application No. | Name | Institute Name | Degree | Admission Type | Allotted Category
 * The round-wise merit lists give each application's All India Merit Rank and in-service incentive percentage.
 * Later rounds re-list candidates whose seat did not change; those rows are skipped. Names are never written.
 *
 * Usage: tsx pipeline/states/himachal.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/himachal';
const U = 'https://amruhp.ac.in/wp-content/uploads/';
// [year, rounds [file, round label, official URL], round-wise merit lists]
const YEARS: [number, [string, string, string][], string[]][] = [
  [2025, [
    ['hp2025_r1', 'Round 1', U + '2025/11/Final-Seat-Allocation-of-MD-MS-DNB-1st-round-Counselling-2025-merged.pdf'],
    ['hp2025_r2', 'Round 2', U + '2025/12/Final-Seat-Allocation-of-MD-MS-DNB-2nd-Round-Counselling-2025-merged.pdf'],
    ['hp2025_r3', 'Round 3', U + '2026/02/Final-Seat-Allocation-of-MD-MS-DNB-3rd-round-Counselling-2025-merged.pdf'],
    ['hp2025_stray', 'Stray', U + '2026/02/Final-Seat-Allocation-of-MD-MS-DNB-Stray-Round-Counselling-2025-merged.pdf'],
    ['hp2025_stray2', 'Special stray', U + '2026/02/Final-Seat-allocation-of-MD-MS-DNB-2nd-Stray-Round-counselling-2025-merged.pdf'],
  ], ['hp2025_merit_r1', 'hp2025_merit_r2', 'hp2025_merit_r3', 'hp2025_merit_stray', 'hp2025_merit_stray2']],
  // 2024 (found through the site's WordPress media API, Nov 2024 – Mar 2025)
  [2024, [
    ['hp2024_r1', 'Round 1', U + '2024/11/Final-Seat-allocation-for-NEET-PG-MD-MS-1st-round-Counselling-2024-website.pdf'],
    ['hp2024_r2', 'Round 2', U + '2024/12/final-Seat-allocation-for-MD-MS-2nd-round-Counselling-2024-23-12-24.pdf'],
    ['hp2024_r3', 'Round 3', U + '2025/02/Final-Seat-Allocation-list-for-PG-MD-MS-3rd-round-counselling-2024-withnotice-for-website.pdf'],
  // Stray / special stray 2024 lists use another layout and most of their candidates registered after round 1; the later
  // merit lists (and NBE's state list) carry no All India Rank, so they are not used.
  ], ['hp2024_merit_r1']],
];
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
async function* tables(file: string) {
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) yield { page: pg.index + 1, rows: gridTable(pg).rows };
}

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const types = new Map<string, number>(), cats = new Map<string, number>(), insts = new Map<string, number>(), degrees = new Map<string, number>();
for (const [year, ROUNDS, MERIT] of YEARS) {
// ---- application number → All India rank, in-service incentive ----
const air = new Map<string, number>(), incentive = new Set<string>();
for (const f of MERIT) {
  let col: Record<string, number> | null = null, n = 0;
  try {
    for await (const { rows } of tables(f)) for (const cells of rows) {
      const ks = cells.map(key);
      if (ks.some((k) => k.startsWith('applicati'))) {
        col = { app: ks.findIndex((k) => k.startsWith('applicati')), rank: ks.findIndex((k) => k.includes('allindia')), inc: ks.findIndex((k) => k.includes('incenti') && !k.includes('score')) };
        continue;
      }
      if (!col || col.rank < 0) continue;
      const app = (cells[col.app] ?? '').replace(/\D/g, ''), rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
      if (!app || !rank) continue;
      if (!air.has(app)) n++;
      air.set(app, rank);
      if (Number(cells[col.inc]) > 0) incentive.add(app);
    }
  } catch { console.log(`  ${f}: not readable`); }
  console.log(`${f}: ${n} new application numbers with a rank`);
}

const held = new Map<string, string>();
for (const [file, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0, same = 0, noAir = 0;
  for await (const { page, rows } of tables(file)) for (const cells of rows) {
    const ks = cells.map(key);
    if (ks.includes('institutename')) {
      col = { app: ks.findIndex((k) => k.startsWith('applicati')), inst: ks.indexOf('institutename'), deg: ks.indexOf('degree'), type: ks.indexOf('admissiontype'),
        cat: ks.findIndex((k) => /^(allocatedseat|allotted|allocation|allocated|)category$/.test(k)) };
      continue;
    }
    if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
    const app = (cells[col.app] ?? '').replace(/\D/g, ''), inst = clean(cells[col.inst]), deg = clean(cells[col.deg]);
    if (!app || !inst) continue;
    listed++;
    const seat = `${key(inst)}|${key(deg)}`;
    if (held.get(app) === seat) { same++; continue; }
    held.set(app, seat);
    const rank = air.get(app);
    if (!rank) { noAir++; continue; }
    const type = clean(cells[col.type]), cat = clean(cells[col.cat]);
    bump(types, type); bump(cats, cat); bump(insts, inst); bump(degrees, deg);
    out.push({ rank, quota: type, incentive: incentive.has(app), institute: inst, course: deg, allottedCategory: cat, candidateCategory: cat, remarks: '', page });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Himachal Pradesh', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (${listed} listed, ${same} kept an earlier seat, ${noAir} without an AIR)`);
}
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('admission types', top(types));
console.log('categories', top(cats));
console.log('institutes', top(insts));
console.log('degrees', Object.keys(top(degrees)).join(' | '));
