/**
 * Odisha NEET PG state counselling (PG Medical Counselling Committee / DMET Odisha, dmetodisha.in) → allotments in the
 * same shape as MCC rounds.
 *
 * 2025 files were removed from dmetodisha.in when the site reset for 2026; these are Internet Archive copies of the
 * official PDFs (web.archive.org/web/<timestamp>id_/<official URL>).
 *   Final list of candidates admitted in Round 1 / upgraded Round 1 (after seat surrender), 18-12-2025:
 *     Serial | Admission Status (ADMITTED R-1 / UGR-1) | Appln No | NEET Roll No | Name | Category | Type (INS = in-service,
 *     DIR = direct) | CMR-UR | Choice No | Admitted College | Course (PG (MD/MS) / DNB) | Subject | Adm Code | Admitted Cat | …
 *   NEET-PG 2025 Odisha eligible list (1st round): … | Roll No | NEET-PG 2025 publish rank | …  → All India Rank by roll number.
 * Admitted categories: UR / SC / ST / PH, GCH = green card holder, ES = ex-servicemen ward.
 * Names are never written.
 *
 * Usage: tsx pipeline/states/odisha.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/odisha';
const WB = 'https://web.archive.org/web/20260321222847id_/https://dmetodisha.in/PGMCC_Static/DOWNLOADSPGM_22/';
const ROUNDS: [string, number, string, string, string, string][] = [ // [out, year, label, list PDF, merit PDF, official file name]
  ['od2025_r1', 2025, 'Round 1', 'or2025_r1_admission.pdf', 'or2025_merit_r1.pdf', 'FINAL%20ADMISSION%20STATE%20ROUND_1_UPGRADED_ROUND_1_AFTER_SURRENDER_PUBLISH_CONVENER_18_12_2025_(180).pdf'],
];
const rows = async (f: string) => { const out: string[][] = []; for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${f}`)))) out.push(...gridTable(pg).rows); return out; };

for (const [file, year, label, list, meritPdf, official] of ROUNDS) {
  const merit = new Map<string, number>();
  for (const c of await rows(meritPdf)) if (/^\d{8,}$/.test(c[9] ?? '') && /^\d+$/.test(c[10] ?? '')) merit.set(c[9], Number(c[10]));
  const out: any[] = []; let noRank = 0;
  for (const c of await rows(list)) {
    if (!/^\d+$/.test(c[0] ?? '') || !/^ADMITTED/.test(c[1] ?? '')) continue;
    const rank = merit.get(c[3]);
    if (!rank) { noRank++; continue; }
    out.push({
      rank, quota: c[6] === 'INS' ? 'In-service' : 'State', institute: c[9], course: c[11], courseType: /^DNB/.test(c[10]) ? 'DNB' : 'MD/MS',
      allottedCategory: c[13], candidateCategory: c[5].replace(/,$/, ''), inService: c[6] === 'INS', upgraded: /UGR/.test(c[1]), remarks: '', page: 0,
    });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: WB + official, url: WB + official, counselling: 'Odisha', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} admissions (${out.filter((r) => r.inService).length} in-service, ${out.filter((r) => r.upgraded).length} upgraded); roll not in merit list ${noRank}; merit list ${merit.size}`);
}
