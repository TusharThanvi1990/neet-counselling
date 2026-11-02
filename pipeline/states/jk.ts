/**
 * Jammu & Kashmir NEET PG state counselling (JKBOPEE, jkbopee.gov.in) → allotments in the same shape as MCC rounds.
 *
 * JKBOPEE "Provisional Selection List" notifications carry the list as Annexure A (ruled table):
 *   S No | Roll No | Name | Category | Sub-Cat | [UTL] | [NEET Rank] | UT Rank | Discipline | Institution | CAT-SLI |
 *   [U/A Discipline | U/A Institution | CAT-SLI]
 * Round 1, the physical round and the stray rounds print the NEET (All India) rank; Rounds 2 and 3 do not, so ranks
 * are joined on roll number from the lists that do. In upgrade rounds the first seat is the one held before and the
 * "U/A" (upgraded/allotted) seat is the new one; rows without a U/A seat are skipped. Names and rolls are never written.
 *
 * Usage: tsx pipeline/states/jk.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/jk';
const N = (nid: number) => `https://www.jkbopee.gov.in/Pdf/Downloader.ashx?nid=${nid}&type=n`;
// [file, round label, notice id]; files sharing a label are merged (later file wins per candidate)
const ROUNDS: [string, string, number][] = [
  ['jk2025_r1', 'Round 1', 17308],
  ['jk2025_hmnri', 'Round 1', 17415], // ASCOMS Hindu-minority / NRI seats, counselled separately
  ['jk2025_r2', 'Round 2', 17407],
  ['jk2025_r3a', 'Round 3', 17505],
  ['jk2025_r3b', 'Round 3', 17511],
  ['jk2025_hm', 'Round 3', 17514],
  ['jk2025_phys', 'Mop-up', 17521],
  ['jk2025_stray', 'Stray', 17530],
  ['jk2025_stray2', 'Special stray', 17536],
];
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();

type Row = { roll: string; rank: number; cat: string; sub: string; course: string; inst: string; seat: string; page: number };
async function read(file: string): Promise<Row[]> {
  const out: Row[] = [];
  let col: Record<string, number> | null = null;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('ROLLNO')) {
        const all = (k: string) => ks.flatMap((x, i) => (x === k ? [i] : []));
        const disc = all('DISCIPLINE'), inst = all('INSTITUTION'), sli = all('CATSLI'), ua = ks.indexOf('UADISCIPLINE');
        col = { roll: ks.indexOf('ROLLNO'), rank: ks.indexOf('NEETRANK'), cat: Math.max(ks.indexOf('CATEGORY'), ks.indexOf('CAT')), sub: Math.max(ks.indexOf('SUBCAT'), ks.indexOf('SUBCAT')),
          disc: ua >= 0 ? ua : disc[0], inst: ua >= 0 ? ks.indexOf('UAINSTITUTION') : inst[0], sli: ua >= 0 ? sli[sli.length - 1] : sli[0], hasUA: ua >= 0 ? 1 : 0 };
        continue;
      }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const roll = (cells[col.roll] ?? '').replace(/\D/g, '');
      const course = clean(cells[col.disc]), inst = clean(cells[col.inst]);
      if (!/^\d{11}$/.test(roll) || !course || !inst) continue; // no new seat in this round
      out.push({ roll, rank: col.rank >= 0 ? Number((cells[col.rank] ?? '').replace(/\D/g, '')) : 0, cat: clean(cells[col.cat]), sub: col.sub >= 0 ? clean(cells[col.sub]) : '',
        course, inst, seat: clean(cells[col.sli]), page: pg.index + 1 });
    }
  }
  return out;
}

const parsed = new Map<string, Row[]>();
const air = new Map<string, number>(), daMarks = new Set<string>();
// Provisional Merit List (notice 17250, 28-10-2025): roll → NEET rank, and DA marks (in-service bonus marks)
for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/jk2025_merit.pdf`)))) {
  let col: Record<string, number> | null = null;
  for (const cells of gridTable(pg).rows) {
    const ks = cells.map(key);
    if (ks.includes('ROLLNO') && ks.includes('NEETRANK')) { col = { roll: ks.indexOf('ROLLNO'), rank: ks.indexOf('NEETRANK'), da: ks.indexOf('DAMARKS') }; continue; }
    if (!col) continue;
    const roll = (cells[col.roll] ?? '').replace(/\D/g, ''), rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
    if (!/^\d{11}$/.test(roll) || !rank) continue;
    air.set(roll, rank);
    if (Number(cells[col.da]) > 0) daMarks.add(roll);
  }
}
console.log(`merit list: ${air.size} roll numbers, ${daMarks.size} with in-service (DA) marks`);
for (const [file] of ROUNDS) {
  const rows = await read(file);
  parsed.set(file, rows);
  for (const r of rows) if (r.rank) air.set(r.roll, r.rank);
}
console.log(`roll → NEET rank: ${air.size}`);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const seats = new Map<string, number>(), insts = new Map<string, number>(), cats = new Map<string, number>();
const byLabel = new Map<string, { files: string[]; ids: number[]; rows: Map<string, Row> }>();
for (const [file, label, nid] of ROUNDS) {
  const g = byLabel.get(label) ?? { files: [], ids: [], rows: new Map() };
  g.files.push(file); g.ids.push(nid);
  // one seat per candidate per round; ASCOMS minority/NRI lists are a separate counselling, so keyed apart
  for (const r of parsed.get(file)!) g.rows.set(/ASCOMS/i.test(r.inst) && file.includes('hm') ? `${r.roll}|hm` : r.roll, r);
  byLabel.set(label, g);
}
for (const [label, g] of byLabel) {
  let noAir = 0;
  const rows = [...g.rows.values()].flatMap((r) => {
    const rank = r.rank || air.get(r.roll);
    if (!rank) { noAir++; return []; }
    bump(seats, r.seat); bump(insts, r.inst); bump(cats, r.cat);
    return [{ rank, quota: r.seat, inService: daMarks.has(r.roll), institute: r.inst, course: r.course, allottedCategory: r.seat, candidateCategory: r.cat, subCategory: r.sub, remarks: '', page: r.page }];
  }).sort((a, b) => a.rank - b.rank);
  const out = `${label === 'Round 1' ? 'jk2025_r1' : label === 'Round 2' ? 'jk2025_r2' : label === 'Round 3' ? 'jk2025_r3' : label === 'Mop-up' ? 'jk2025_mopup' : label === 'Stray' ? 'jk2025_stray' : 'jk2025_stray2'}`;
  const url = N(g.ids[0]);
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: url, url, counselling: 'Jammu & Kashmir', year: 2025, round: label, rows }));
  console.log(`${out}: ${rows.length} allotments from ${g.files.join(', ')} (${noAir} without a NEET rank)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('seat categories (CAT-SLI)', top(seats));
console.log('candidate categories', top(cats));
console.log('institutes', top(insts));
