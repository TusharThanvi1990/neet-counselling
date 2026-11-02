/**
 * Kerala NEET PG state counselling (CEE Kerala, PG Medical) → allotments in the same shape as MCC rounds.
 *
 * CEE's allotment lists are ruled tables:
 *   Sl.No | ApplNo | Rank | College Name | Course | Candidate Category | Alloted Category | Option No.
 * "Rank" is the NEET PG All India Rank (checked against CEE's Kerala State Merit List, which prints NEET Rank).
 * Each phase lists only the allotments made in that phase. No names are printed; ApplNo is not kept.
 *
 * Usage: tsx pipeline/states/kerala.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/kerala';
const CEE = 'https://cee.kerala.gov.in/pgm2025/list/';
const ROUNDS: [string, string, string][] = [ // [file, round label, official PDF]
  ['kl2025_r1', 'Round 1', 'allot_p1_final.pdf'],
  ['kl2025_r2', 'Round 2', 'allot_p2_final.pdf'],
  ['kl2025_r3', 'Round 3', 'allot_p3_final.pdf'],
  ['kl2025_stray', 'Stray', 'allot_p4.pdf'],
];
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const cats = new Map<string, number>(), ccats = new Map<string, number>();
for (const [file, label, pdf] of ROUNDS) {
  const rows: any[] = [];
  let idx: Record<string, number> | null = null, breaks = 0, prev = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks[0] === 'slno' && ks.includes('rank')) {
        // two-row header: "Category" under "Candidate" / "Alloted"; the first Category column is the candidate's
        const catCols = ks.map((k, i) => (k === 'category' ? i : -1)).filter((i) => i >= 0);
        idx = { rank: ks.indexOf('rank'), college: ks.indexOf('collegename'), course: ks.indexOf('course'), ccat: catCols[0], acat: catCols[1], opt: ks.indexOf('optionno') };
        continue;
      }
      if (!idx || !/^\d+$/.test(cells[0] ?? '') || !/^\d+$/.test(cells[idx.rank] ?? '')) continue;
      const get = (i: number) => (cells[i] ?? '').replace(/\s+/g, ' ').trim();
      const rank = Number(get(idx.rank));
      if (rank < prev) breaks++;
      prev = rank;
      const college = get(idx.college), course = get(idx.course);
      const cm = college.match(/^([A-Z0-9]+)-\s*(.*)$/), km = course.match(/^([A-Z0-9]+)-\s*(.*)$/);
      const acat = get(idx.acat), ccat = get(idx.ccat);
      cats.set(acat, (cats.get(acat) ?? 0) + 1); ccats.set(ccat, (ccats.get(ccat) ?? 0) + 1);
      rows.push({
        rank, quota: 'State', collegeCode: cm?.[1] ?? '', institute: cm?.[2] ?? college, courseCode: km?.[1] ?? '', course: km?.[2] ?? course,
        allottedCategory: acat, candidateCategory: ccat, remarks: '', page: pg.index + 1,
      });
    }
  }
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: CEE + pdf, url: CEE + pdf, counselling: 'Kerala', year: 2025, round: label, rows }));
  console.log(`${file}: ${rows.length} allotments, rank-order breaks ${breaks}`);
}
console.log('allotted categories', Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])));
console.log('candidate categories', Object.fromEntries([...ccats].sort((a, b) => b[1] - a[1])));
