/**
 * Madhya Pradesh NEET PG state counselling (DME MP, dme.mponline.gov.in) → allotments in the same shape as MCC rounds.
 *
 * DME MP publishes per round an "Allotment List (Provisional)" as a ruled table:
 *   S.No | Roll No | Name | State Common Merit Rank | NEET PG AI Rank | Score | Final Score | Candidate Type | … |
 *   Eligible Category | [Allotted Course | Institute Type | Institute Name | Subject | Subject Type | Category/Class] × rounds | Status
 * Round 1 has one allotment group; later rounds repeat the earlier rounds' groups and add their own (last group) plus a
 * status (NOT UPGRADED / UPGRADED FROM … ROUND / FRESH ALLOTTED …). Only seats allotted in the current round are kept:
 * the last group must be filled and differ from the seat held in the previous group. Names and roll numbers are
 * skipped and never written.
 *
 * Usage: tsx pipeline/states/madhyapradesh.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/mp';
const DME = 'https://dme.mponline.gov.in/ql_dme/DMECounselling_Public/DMEPG/';
const MD = 'https://medicaldialogues.in/pdf_upload/2026/02/19/';
// [file, year, round label, source URL]
const ROUNDS: [string, number, string, string][] = [
  ['mp2025_r1', 2025, 'Round 1', DME + '2025/DISPLAY%20RESULT_FORMAT%20_DME_PG_MDMS_REPORT_FR_75.pdf'],
  ['mp2025_r2', 2025, 'Round 2', DME + '2025/DISPLAY%20ALLOTMENT_FORMAT%20%20PG_MDMS_REPORT_SR_90.pdf'],
  // the official mop-up file is no longer linked on the DME site; this is Medical Dialogues' copy of the DME PDF
  ['mp2025_r3', 2025, 'Mop-up', MD + 'display-allotment-mopup-round-328500.pdf'],
  ['mp2026_r1', 2026, 'Round 1', DME + '2026/DISPLAY_ALLOTMENT_RESULT%20LIST_c_57.pdf'],
];
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const NONE = /^(|NOTALLOTTED|NA|-)$/;

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const statuses = new Map<string, number>(), cats = new Map<string, number>(), insts = new Map<string, number>(), types = new Map<string, number>(), courses = new Map<string, number>();
for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: { air: number; elig: number; ctype: number; status: number; groups: Record<string, number>[] } | null = null;
  let listed = 0, kept = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.some((k) => k === 'ALLOTTEDINSTITUTENAME')) {
        const all = (name: string) => ks.flatMap((k, i) => (k === name ? [i] : []));
        const course = all('ALLOTTEDCOURSE'), type = all('ALLOTTEDINSTITUTETYPE'), inst = all('ALLOTTEDINSTITUTENAME'), subj = all('ALLOTTEDSUBJECT'),
          cat = all('ALLOTTEDCATEGORYCLASS');
        col = {
          air: ks.findIndex((k) => /AIRANK$/.test(k)), elig: ks.findIndex((k) => k === 'ELIGIBLECATEGORY'), ctype: ks.findIndex((k) => k === 'CANDIDATETYPE'),
          status: ks.findIndex((k) => k === 'STATUS'),
          groups: inst.map((_, g) => ({ course: course[g], type: type[g], inst: inst[g], subj: subj[g], cat: cat[g] })),
        };
        continue;
      }
      if (!col || col.air < 0) continue;
      const rank = Number((cells[col.air] ?? '').replace(/\D/g, ''));
      if (!rank || !/^\d/.test(cells[0] ?? '')) continue;
      listed++;
      const seat = (g: Record<string, number>) => ({
        course: clean(cells[g.course]), type: clean(cells[g.type]), inst: clean(cells[g.inst]), subj: clean(cells[g.subj]), cat: clean(cells[g.cat]),
      });
      const now = seat(col.groups[col.groups.length - 1]);
      const before = col.groups.length > 1 ? seat(col.groups[col.groups.length - 2]) : null;
      const status = col.status >= 0 ? clean(cells[col.status]) : '';
      bump(statuses, status);
      if (NONE.test(key(now.inst))) continue;
      const same = (a: typeof now, b: typeof now | null) => !!b && key(a.inst) === key(b.inst) && key(a.subj) === key(b.subj) && key(a.cat) === key(b.cat);
      if (same(now, before)) continue; // held over from an earlier round
      kept++;
      bump(cats, now.cat); bump(insts, key(now.inst)); bump(types, now.type); bump(courses, `${now.course}|${now.subj}`);
      out.push({
        rank, quota: now.type, institute: now.inst, course: now.course, subject: now.subj, allottedCategory: now.cat,
        candidateCategory: clean(cells[col.elig]), candidateType: clean(cells[col.ctype]), remarks: status, page: pg.index + 1,
      });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Madhya Pradesh', year, round: label, rows: out }));
  console.log(`${file}: ${kept} allotments in this round (of ${listed} listed)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('status', top(statuses));
console.log('institute types', top(types));
console.log('categories', top(cats));
console.log('institutes', top(insts));
console.log('courses', Object.keys(top(courses)).length);
