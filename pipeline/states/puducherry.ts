/**
 * Puducherry NEET PG state counselling (CENTAC, centacpuducherry.in) → allotments in the same shape as MCC rounds.
 *
 * CENTAC's "Provisional allotment list of PG Medical courses" is split into sections, one per quota and college, each headed
 * "<QUOTA> - [ <COLLEGE> ]" (GOVERNMENT QUOTA, MANAGEMENT QUOTA, MANAGEMENT QUOTA (CHRISTIAN / TELUGU MINORITY), NRI QUOTA):
 *   SL NO | APP NO | Name | NEET Roll No | NEET percentile (2024) / score (2025) | NEET All India Rank | Applied category |
 *   Alloted category | Branch | Round status
 * Round status: FIRST / FRESH = new seat, UPGRADED / TRANSFER = moved to a new seat (counted for this round), RETAINED = kept
 * the earlier seat (skipped). Alloted categories are CENTAC codes (UGE = U.T. general, UOB / UMB / UEB / USC / UBT …).
 * The 2025 Round 1 provisional list was not found; the "PG Medical admitted list – first round" (candidates who joined) is
 * used instead. Names, roll and application numbers are never written.
 *
 * Sources: CENTAC's own Google Drive copies (linked from centacpuducherry.in; links found on t.me/SRISAINEETPG).
 *
 * Usage: tsx pipeline/states/puducherry.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';
import { pageLines } from '../textlines';

const RAW = 'data/raw/states/puducherry';
const G = (id: string) => `https://drive.google.com/file/d/${id}/view`;
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, source]
  ['py2024_r1', 2024, 'Round 1', G('1J1_DdCKX97e-IsBu2hQbqxmZinrAusnp')], // 26-11-2024
  ['py2024_r2', 2024, 'Round 2', G('1qZcncGTc-EnoGb4UJjoLPVFoTpyIFFTd')],
  ['py2024_r3', 2024, 'Round 3', G('1BHyDsc1veHxvjpSQqqgGHlHcKV6402v0')],
  ['py2024_stray', 2024, 'Stray', G('1M_NFAorkyu8aiA0N4Lfm_mGY_-27TMbb')],
  ['py2024_sstray', 2024, 'Special stray', G('1lbedf-ErCRIRg4id79npVDrZIkXuthN1')],
  ['py2025_r1_admitted', 2025, 'Round 1', G('1gnNXD0ZE5Ed5ORhd56L0EZaDcXWWkim4')], // admitted list, 15-12-2025
  ['py2025_r2', 2025, 'Round 2', G('13DQVu_b1NuwmfIyDmXBKDAX6gDeZNhy8')],
  ['py2025_r3', 2025, 'Round 3', G('1tRRAzAI_87yv3oEp1cxf_IEJMsLBt1bZ')], // 16-02-2026
  ['py2025_stray', 2025, 'Stray', G('1rl9gY7cqeeMqYBr5JgJD1-m8aPNf1aIM')],
];
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const sections = new Map<string, number>(), cats = new Map<string, number>(), statuses = new Map<string, number>(), branches = new Map<string, number>();

for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, quota = '', college = '', listed = 0, retained = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const l of pageLines(pg)) {
      const m = l.words.map((w) => w.text).join(' ').match(/^\s*((?:GOVERNMENT|MANAGEMENT|NRI)[A-Z ()]*?)\s*-\s*\[\s*(.+?)\s*\]/);
      if (m) { quota = clean(m[1]); college = clean(m[2]); }
    }
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('branch')) {
        const f = (re: RegExp) => ks.findIndex((k) => re.test(k));
        col = { rank: f(/allindiarank$|^rank$/), cat: f(/^appliedcategory$/), acat: f(/^allot+edcategory$/), branch: f(/^branch$/), status: f(/status$/) };
        continue;
      }
      if (!col || !/^\d+$/.test(clean(cells[0]))) continue;
      const branch = clean(cells[col.branch]), rank = Number(clean(cells[col.rank]).replace(/\D/g, ''));
      if (!branch || !rank) continue;
      listed++;
      const status = clean(cells[col.status]).toUpperCase();
      bump(statuses, status);
      if (/RETAIN/.test(status)) { retained++; continue; }
      bump(sections, `${quota} | ${college}`); bump(cats, clean(cells[col.acat])); bump(branches, branch);
      out.push({ rank, quota, institute: college, course: branch, allottedCategory: clean(cells[col.acat]), candidateCategory: clean(cells[col.cat]),
        status, remarks: '', page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  const name = file.replace(/_admitted$/, '');
  writeFileSync(`data/parsed/${name}.json`, JSON.stringify({ source: url, url, counselling: 'Puducherry', year, round: label, rows: out }));
  console.log(`${name}: ${out.length} allotments (${listed} listed, ${retained} retained an earlier seat)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('sections', top(sections));
console.log('categories', top(cats));
console.log('statuses', top(statuses));
console.log('branches', Object.keys(top(branches)).join(' | '));
