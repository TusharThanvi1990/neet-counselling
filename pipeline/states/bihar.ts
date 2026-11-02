/**
 * Bihar NEET PG state counselling (BCECEB, PGMAC) → allotments in the same shape as MCC rounds.
 *
 * BCECEB publishes per round a "Seat Allotment Result of PGMAC-2025" (ruled table):
 *   Course Type | PGMAC Id | NEET Roll | NEET Appl | NEET AIR | Name | Gender | Category | NEET Cat | [state ranks …] |
 *   Institute | Branch | [Allotted Cat] | Remark | Allot Status
 * NEET AIR is the All India Rank. Later rounds list everyone holding a seat; only rows whose status is a fresh allotment
 * or an upgrade are kept. The seat category comes from "Allotted Cat" when printed, else from the remark
 * ("Against UR Category Seat(Degree)-Female", "JUMP OVER ON EBC seat(Degree)"). Names, roll numbers and ids are skipped.
 *
 * Round 1's result was withdrawn and re-issued and is no longer on the board's site; Rounds 2 (revised), 3 (revised)
 * and the stray vacancy round are.
 *
 * Usage: tsx pipeline/states/bihar.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/bihar';
const BASE = 'https://bceceboard.bihar.gov.in/pdf_Result/';
const ROUNDS: [string, string, string][] = [ // [file, round label, official file]
  ['bh2025_r2', 'Round 2', 'REV_PGMAC25_ALT_R2.pdf'],
  ['bh2025_r3', 'Round 3', 'REV_PGMAC25_ALT_R3.pdf'],
  ['bh2025_r4', 'Stray', 'PGMAC25_ALT_R4.pdf'],
];
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const statuses = new Map<string, number>(), remarks = new Map<string, number>(), insts = new Map<string, number>(), branches = new Map<string, number>(), types = new Map<string, number>();
/** "AgainstURCategorySeat(Degree)-Female" → UR; "JUMPOVERONEBCseat(Degree)" → EBC. */
const fromRemark = (r: string) => {
  const k = key(r);
  const dq = k.match(/AGAINSTDQCATEGORYSEAT(UR|SC|ST|BC|EBC|EWS)/); // DQ seats sit inside a vertical category
  if (dq) return `DQ-${dq[1]}`;
  return k.match(/COMPENSATIONSEAT([A-Z]+?)AGAINST/)?.[1] ?? k.match(/(?:AGAINST|JUMPOVERON)([A-Z]+?)(?:CATEGORY)?SEAT/)?.[1] ?? '';
};
for (const [file, label, official] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('NEETAIR')) {
        const f = (k: string) => ks.indexOf(k);
        col = { type: f('COURSETYPE'), air: f('NEETAIR'), cat: f('CATEGORY'), gender: f('GENDER'), inst: f('INSTITUTE'), branch: f('BRANCH'), acat: f('ALLOTTEDCAT'),
          remark: f('REMARK'), status: Math.max(f('ALLOTSTATUS'), f('ALLOTTSTATUS'), f('STATUS')) };
        continue;
      }
      if (!col || !/^(DEGREE|DIPLOMA)/i.test(cells[col.type] ?? '')) continue;
      const rank = Number((cells[col.air] ?? '').replace(/\D/g, ''));
      if (!rank) continue;
      listed++;
      const status = clean(cells[col.status]), remark = clean(cells[col.remark]), inst = clean(cells[col.inst]), branch = clean(cells[col.branch]);
      bump(statuses, key(status));
      if (!inst || !/FRESH|UPGRAD/.test(key(status))) continue; // retained / not allotted / held from an earlier round
      const acat = (col.acat >= 0 ? clean(cells[col.acat]) : '') || fromRemark(remark);
      bump(remarks, `${acat} ← ${key(remark).replace(/\(?DEGREE\)?|\(?DIPLOMA\)?/g, '')}`); bump(insts, inst); bump(branches, `${cells[col.type]}|${branch}`); bump(types, key(cells[col.type]));
      out.push({ rank, quota: 'State', courseType: clean(cells[col.type]), institute: inst, course: branch, allottedCategory: acat, candidateCategory: clean(cells[col.cat]),
        female: /FEMALE/.test(key(remark)), remarks: remark, page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  const url = BASE + official;
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Bihar', year: 2025, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments in this round (of ${listed} listed)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('status', top(statuses));
console.log('course types', top(types));
console.log('category ← remark', top(remarks));
console.log('institutes', top(insts));
console.log('branches', Object.keys(top(branches)).join(' | '));
