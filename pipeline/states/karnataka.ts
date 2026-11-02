/**
 * Karnataka NEET PG state counselling (KEA, PGET Medical) → allotments in the same shape as MCC rounds.
 *
 * KEA's final allotment lists are ruled tables that already print the All India Rank and no candidate names:
 *   SL.NO | All India Rank | Course Code | Name of the College Allotted | Course Name | Allotted Category | Course fees [| DEP] [| Status]
 * Course Code = college (M01) + seat type letter (G govt, P private, Q management, …) + KEA course code (C4).
 * Later rounds list everyone holding a seat; rows marked "Not Upgraded" kept an earlier seat and are skipped,
 * so each round counts only the seats it actually allotted (as with MCC).
 *
 * Usage: tsx pipeline/states/karnataka.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/karnataka';
const KEA = 'https://cetonline.karnataka.gov.in/keawebentry456/pgetmed2025/';
const ROUNDS: [string, string, string, string][] = [ // [file, round label, quota group, official PDF]
  ['ka2025_r1', 'Round 1', 'State', 'PGNEET_MEED_ALLOT_2025_R1_FIN_29112025english.pdf'],
  ['ka2025_r2', 'Round 2', 'State', 'PGNEET_MEED_ALLOT_2025_NON_INS_R2_FINAL_24122025english.pdf'],
  ['ka2025_r3', 'Round 3', 'State', 'PGNEET_MEED_ALLOT_2025_NON_INS_MOPUP_25022026.pdf'],
  ['ka2025_stray', 'Stray', 'State', 'PGNEET_MEED_ALLOT_2025_NON_INS_STRAY_07032026_FINLenglish.pdf'],
  ['ka2025_stray2', 'Special stray', 'State', 'PGNEET_MEED_ALLOT_2025_NON_INS_STRAY_11032026_FINLenglish.pdf'],
  ['ka2025_ins_r1', 'Round 1', 'In-service', 'PGNEET_MEED_ALLOT_2025_INS_final_12122025english.pdf'],
  ['ka2025_ins_r2', 'Round 2', 'In-service', 'PGNEET_MEED_ALLOT_2025_INS_R2_FINAL_23122025english.pdf'],
  ['ka2025_ins_r3', 'Round 3', 'In-service', 'PGNEET_MEED_ALLOT_2025_INS_MOPUP_25022026.pdf'],
];
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const FIELDS: Record<string, string> = {
  slno: 'sl', allindiarank: 'rank', coursecode: 'code', nameofthecollegeallotted: 'college', coursename: 'course',
  allottedcategory: 'cat', coursefees: 'fee', dep: 'dep', status: 'status',
};

// In-service candidates get separate lists (and PDFs), so they stay separate rounds under "Karnataka in-service".
const out = new Map<string, { label: string; url: string; counselling: string; rows: any[] }>();
const statuses = new Map<string, number>(), cats = new Map<string, number>();
for (const [file, label, group, pdf] of ROUNDS) {
  let idx: Record<string, number> | null = null, n = 0, skipped = 0, prevRank = 0, breaks = 0;
  const o = { label, url: KEA + pdf, counselling: group === 'In-service' ? 'Karnataka in-service' : 'Karnataka', rows: [] as any[] };
  out.set(file, o);
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('allindiarank')) { idx = {}; ks.forEach((k, i) => { if (FIELDS[k]) idx![FIELDS[k]] = i; }); continue; }
      if (!idx || !/^\d+$/.test(cells[idx.sl] ?? '') || !/^\d+$/.test(cells[idx.rank] ?? '')) continue;
      const get = (f: string) => (idx![f] == null ? '' : cells[idx![f]] ?? '').trim();
      const status = get('status');
      statuses.set(status, (statuses.get(status) ?? 0) + 1);
      if (/not\s*upgraded|not\s*allotted|cancel|surrender/i.test(status) || !get('college')) { skipped++; continue; }
      const rank = Number(get('rank')), code = get('code').replace(/\s+/g, '');
      if (rank < prevRank) breaks++;
      prevRank = rank;
      const m = code.match(/^(M\d+)([A-Z])([A-Z]\d+)$/);
      cats.set(get('cat'), (cats.get(get('cat')) ?? 0) + 1);
      o.rows.push({
        rank, quota: group, collegeCode: m?.[1] ?? '', seatType: m?.[2] ?? '', courseCode: m?.[3] ?? '',
        institute: get('college').replace(/\s+/g, ' '), course: get('course'), allottedCategory: get('cat'),
        candidateCategory: get('cat'), fee: Number(get('fee').replace(/\D/g, '')) || null, remarks: status, page: pg.index + 1,
      });
      n++;
    }
  }
  console.log(`${file}: ${n} allotments, ${skipped} kept an earlier seat, rank-order breaks ${breaks}`);
}
for (const [id, o] of out) {
  o.rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${id}.json`, JSON.stringify({
    source: o.url, url: o.url, counselling: o.counselling, year: 2025, round: o.label, rows: o.rows,
  }));
  console.log(`→ data/parsed/${id}.json  ${o.rows.length} rows`);
}
console.log('status values', Object.fromEntries(statuses));
console.log('categories', Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])));
