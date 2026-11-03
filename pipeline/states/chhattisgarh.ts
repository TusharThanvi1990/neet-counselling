/**
 * Chhattisgarh NEET PG state counselling (DME Chhattisgarh, cgdme.admissions.nic.in) → allotments in the same shape
 * as MCC rounds.
 *
 * Allotment lists (ruled tables) print the All India NEET Rank:
 *   SN | Roll No | [Category | PH] | Allotted Institute | Allotted Program | Preference | Alloted Quota | Alloted Category |
 *   Allotted Gender | Candidate Gender | NEET Rank | State Rank | [Score | Bonus | Total] | Candidature Type | [Remark]
 * In-service candidates get bonus marks on the state merit list, so they are flagged (Candidature Type "Inservice").
 * Later rounds re-list upgraded and retained seats; rows remarked as retained / no change are skipped.
 *
 * 2025: Rounds 1 and 2 were cancelled (22-01-2026) after a rules amendment and re-run as one "Combined Round-1 &
 * Round-2" list (28-01-2026); the cancelled lists are not used. Roll numbers are never written.
 *
 * Usage: tsx pipeline/states/chhattisgarh.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/chhattisgarh';
const B = 'https://cdnbbsr.s3waas.gov.in/s34b4edc2630fe75800ddc29a7b4070add/uploads/';
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, official URL]
  ['cg2025_r12', 2025, 'Round 1', B + '2026/01/20260129851172184.pdf'],
  ['cg2025_r3', 2025, 'Mop-up', B + '2026/02/202602141449380019.pdf'],
  ['cg2025_r4', 2025, 'Stray', B + '2026/02/202602241888559331.pdf'],
  ['cg2025_r5', 2025, 'Special stray', B + '2026/02/2026022793203666.pdf'],
  ['cg2026_r1', 2026, 'Round 1', B + '2026/10/202610311822194150.pdf'],
  // 2024 (files found through Internet Archive listings of the DME uploads folder; still on the CDN). These lists have
  // no remarks column, so a seat held from the previous round is spotted by roll number and dropped.
  ['cg2024_r1', 2024, 'Round 1', B + '2024/12/2024120215.pdf'],
  ['cg2024_r2', 2024, 'Round 2', B + '2024/12/2024121840.pdf'],
  ['cg2024_r3', 2024, 'Mop-up', B + '2025/02/2025021050-1.pdf'],
  ['cg2024_r4', 2024, 'Stray', B + '2025/03/2025030953.pdf'],
];
const held = new Map<string, string>(); // `${year}|${roll}` → seat in the previous round (2024 only)
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const remarks = new Map<string, number>(), quotas = new Map<string, number>(), cats = new Map<string, number>(), insts = new Map<string, number>(), progs = new Map<string, number>(), types = new Map<string, number>();
for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.some((k) => k.startsWith('allottedinstitute'))) {
        const f = (re: RegExp) => ks.findIndex((k) => re.test(k));
        col = { roll: f(/rollno$/), inst: f(/^allottedinstitute/), prog: f(/^(allottedprogram|appliedcourse)/), quota: f(/^allotedquota/), cat: f(/^allotedcat/), gender: f(/^allottedgender/),
          rank: f(/(neetrank|neetoverallrank)$/), ccat: f(/^candidatecategory/), ph: f(/^ph$/), type: f(/^candidaturetype/), remark: f(/^remark/) };
        continue;
      }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
      const get = (i: number) => (i < 0 ? '' : clean(cells[i]));
      if (!rank || !get(col.inst)) continue;
      listed++;
      const remark = get(col.remark);
      bump(remarks, remark);
      if (/retain|no\s*change|not\s*upgrad|same/i.test(remark)) continue; // seat held from an earlier round
      if (year === 2024) {
        const k = `${year}|${get(col.roll)}`, seat = [col.inst, col.prog, col.quota, col.cat].map(get).join('|');
        if (held.get(k) === seat) continue;
        held.set(k, seat);
      }
      const type = get(col.type);
      bump(quotas, get(col.quota)); bump(cats, get(col.cat)); bump(insts, get(col.inst)); bump(progs, get(col.prog)); bump(types, type);
      out.push({ rank, quota: get(col.quota), inService: /in\s*-?\s*service/i.test(type), institute: get(col.inst), course: get(col.prog), allottedCategory: get(col.cat),
        candidateCategory: get(col.ccat), pwd: /^y/i.test(get(col.ph)), candidature: type, remarks: remark, page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Chhattisgarh', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (of ${listed} listed)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('remarks', top(remarks));
console.log('quotas', top(quotas));
console.log('categories', top(cats));
console.log('candidature', top(types));
console.log('institutes', top(insts));
console.log('programs', Object.keys(top(progs)).join(' | '));
