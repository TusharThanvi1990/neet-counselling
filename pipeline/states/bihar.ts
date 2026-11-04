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
 * Round 1's result was withdrawn and re-issued (REV_PGMAC25_FALT.pdf, 28-11-2025); Rounds 2 (revised), 3 (revised)
 * and the stray vacancy round are.
 *
 * Usage: tsx pipeline/states/bihar.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/bihar';
const BASE = 'https://bceceboard.bihar.gov.in/pdf_Result/';
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, official file]
  // Round 1 as revised on 28-11-2025 (the first issue was withdrawn); still on the board's site. Columns as Round 2, no status column.
  ['bh2025_r1', 2025, 'Round 1', BASE + 'REV_PGMAC25_FALT.pdf'],
  ['bh2025_r2', 2025, 'Round 2', BASE + 'REV_PGMAC25_ALT_R2.pdf'],
  ['bh2025_r3', 2025, 'Round 3', BASE + 'REV_PGMAC25_ALT_R3.pdf'],
  ['bh2025_r4', 2025, 'Stray', BASE + 'PGMAC25_ALT_R4.pdf'],
  // 2024 Round 1 ("List of allotted candidate through first round counselling of PGMAC-2024", still on the board's site).
  // Columns: Course Type | PGMAC Id | NEET Appl | NEET AIR | Name | Cat | Sex | [state ranks …] | Institute | Course | Remark; no
  // status column (every row is a fresh allotment). Later 2024 rounds are no longer online.
  ['bh2024_r1', 2024, 'Round 1', 'https://bceceboard.bihar.gov.in/pdf_Web/PGMAC2024_FALTM.pdf'],
  // "FSALTM" repeats the Round 1 list (no status column) and then the Round 2 list (with a status column): only rows under a
  // header with a status column are read. Round 3 is not on the site; the stray final result (02-03-2025) is.
  ['bh2024_r2', 2024, 'Round 2', 'https://bceceboard.bihar.gov.in/pdf_Web/PGMAC2024_FSALTM.pdf'],
  ['bh2024_r4', 2024, 'Stray', 'https://bceceboard.bihar.gov.in/pdf_Web/PGMAC2024_STRAY_ALTM.pdf'],
  // Special stray vacancy round result ("SSV_RESULT", March 2025), still on the board's site.
  ['bh2024_r5', 2024, 'Special stray', 'https://bceceboard.bihar.gov.in/pdf_Web/PGMAC2024_SSV_RESULT.pdf'],
];
const NEED_STATUS = new Set(['bh2024_r2']);
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const statuses = new Map<string, number>(), remarks = new Map<string, number>(), insts = new Map<string, number>(), branches = new Map<string, number>(), types = new Map<string, number>();
/** "AgainstURCategorySeat(Degree)-Female" → UR; "JUMPOVERONEBCseat(Degree)" → EBC. */
const fromRemark = (r: string) => {
  const k = key(r);
  const dq = k.match(/AGAINSTDQCATEGORYSEAT(UR|SC|ST|BC|EBC|EB|EWS)/); // DQ seats sit inside a vertical category
  if (dq) return `DQ-${dq[1]}`;
  return k.match(/COMPENSATIONSEAT([A-Z]+?)AGAINST/)?.[1] ?? k.match(/(?:AGAINST|JUMPOVERON)([A-Z]+?)(?:CATEGORY)?SEAT/)?.[1] ?? '';
};
for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('NEETAIR')) {
        const f = (k: string) => ks.indexOf(k);
        col = { type: Math.max(f('COURSETYPE'), f('SEATTYPE')), air: f('NEETAIR'), cat: Math.max(f('CATEGORY'), f('CAT')), gender: Math.max(f('GENDER'), f('SEX')), inst: f('INSTITUTE'), branch: Math.max(f('BRANCH'), f('COURSE')), acat: f('ALLOTTEDCAT'),
          remark: f('REMARK'), status: Math.max(f('ALLOTSTATUS'), f('ALLOTTSTATUS'), f('STATUS')) };
        // 2024 Round 2 / stray headers: "ALLOTTEDREMARKS | Remarks" (status in Remarks) or "REMARKS | STATUS"
        if (col.remark < 0) col.remark = ks.indexOf('ALLOTTEDREMARKS') >= 0 ? ks.indexOf('ALLOTTEDREMARKS') : ks.indexOf('REMARKS');
        if (col.status < 0 && ks.includes('ALLOTTEDREMARKS')) col.status = ks.indexOf('REMARKS');
        continue;
      }
      if (!col || !/^(DEGREE|DIPLOMA)/i.test(cells[col.type] ?? '')) continue;
      const rank = Number((cells[col.air] ?? '').replace(/\D/g, ''));
      if (!rank) continue;
      listed++;
      const status = clean(cells[col.status]), remark = clean(cells[col.remark]), inst = clean(cells[col.inst]), branch = clean(cells[col.branch]);
      bump(statuses, key(status));
      if (col.status < 0 && NEED_STATUS.has(file)) continue;
      if (!inst || (col.status >= 0 && !/FRESH|UPGRAD/.test(key(status)))) continue; // retained / not allotted / held from an earlier round
      // a bare "DQ" in the Allotted Cat column leaves the vertical category to the remark ("Against DQ Category Seat(EB)")
      const printed = col.acat >= 0 ? clean(cells[col.acat]) : '';
      const acat = (/^DQ$/i.test(printed) ? '' : printed) || fromRemark(remark);
      bump(remarks, `${acat} ← ${key(remark).replace(/\(?DEGREE\)?|\(?DIPLOMA\)?/g, '')}`); bump(insts, inst); bump(branches, `${cells[col.type]}|${branch}`); bump(types, key(cells[col.type]));
      out.push({ rank, quota: 'State', courseType: clean(cells[col.type]), institute: inst, course: branch, allottedCategory: acat, candidateCategory: clean(cells[col.cat]),
        female: /FEMALE/.test(key(remark)), remarks: remark, page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Bihar', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments in this round (of ${listed} listed)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('status', top(statuses));
console.log('course types', top(types));
console.log('category ← remark', top(remarks));
console.log('institutes', top(insts));
console.log('branches', Object.keys(top(branches)).join(' | '));
