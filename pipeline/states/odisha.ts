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

// ---- 2024 (Internet Archive copies of the DMET files; neither list prints an AIR, which comes from the NBEMS NEET-PG
// 2024 result, data/raw/nbems/neetpg2024_air.json) ----
// Round 1: the admitted list (Serial | Appln No | Roll | Name | Category | Type | UR rank | Choice | College | Course | Subject | Seat cat).
// Rounds 2+: the merit list with admission status published before Round 4 gives every candidate's current seat and the
// round it was admitted in (Serial | Roll | Percentile | Appln | Name | CMR… | Status | Course | College | Subject | Cat | Round);
// rows admitted in Round 2 or later are that round's allotments. The 2024 PDFs drop spaces ("SCBMCH CUTTACK",
// "GENMEDICINE"), so names are restored from the 2025 spellings.
{
  const air24 = JSON.parse(readFileSync('data/raw/nbems/neetpg2024_air.json', 'utf8')) as Record<string, [number, number]>;
  const nk = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  const prev = JSON.parse(readFileSync('data/parsed/od2025_r1.json', 'utf8')).rows as any[];
  const COLLEGE = new Map<string, string>(), SUBJECT = new Map<string, string>();
  for (const r of prev) { COLLEGE.set(nk(r.institute.replace(/\s*\(MGT\)/, '')), r.institute.replace(/\s*\(MGT\)/, '')); SUBJECT.set(nk(r.course), r.course); }
  const missing = new Set<string>();
  // 2024 spellings that differ from 2025 (subjects that 2025's Round 1 did not have are kept as they are)
  const SUBJ_ALIAS: Record<string, string> = { OBSTGYN: 'OBST AND GYNE', RADIOTHERPAY: 'RADIOTHERAPY', OPTHALMOLOGY: 'OPHTHALMOLOGY', TRANSFUSIONMED: 'TRANSFUSION MEDICINE',
    RESPIRATORYMED: 'RESP MEDICINE', FMT: 'FORENSIC MEDICINE', OTORHINOLARYNGOLOGY: 'OTORHINOLARYNGOLOGY', DERMATOLOGY: 'DERMATOLOGY', PAEDIATRICS: 'PEDIATRICS',
    ANAESTHESIOLOGY: 'ANESTHESIOLOGY', TRANSFUSIONMEDICINE: 'TRANSFUSION MEDICINE' };
  const college = (s: string) => {
    const mgt = /\(MGT\)/.test(s), k = nk(s.replace(/\(MGT\)/, '')).replace(/^HITECHBHUBANESWAR$/, 'HITECHMCHBHUBANESWAR');
    const c = COLLEGE.get(k) ?? (k === 'HITECHMCHBHUBANESWAR' ? 'HI-TECH MCH BHUBANESWAR' : k === 'HITECHMCHROURKELA' ? 'HI-TECH MCH ROURKELA' : undefined);
    if (!c) missing.add(`college ${s}`);
    return (c ?? s) + (mgt ? ' (MGT)' : '');
  };
  const subject = (s: string) => { const c = SUBJECT.get(nk(s)) ?? SUBJ_ALIAS[nk(s)]; if (!c) missing.add(`subject ${s}`); return c ?? s; };
  const CAT24: Record<string, string> = { GC: 'GCH', PC: 'PH' };
  const A = 'https://web.archive.org/web/2025*/dmetodisha.in/PGMCC_Static/DOWNLOADSPGM_22/*'; // Internet Archive listing of the DMET folder
  const byRound = new Map<number, any[]>();
  let noRank = 0;
  const push = (round: number, roll: string, row: any) => {
    const rank = air24[roll]?.[0];
    if (!rank) { noRank++; return; }
    (byRound.get(round) ?? byRound.set(round, []).get(round)!).push({ rank, ...row });
  };
  for (const c of await rows('or2024_r1_admission.pdf')) {
    if (!/^\d+$/.test(c[0] ?? '') || !/^\d{11}$/.test(c[2] ?? '')) continue;
    const ins = c[5] === 'INS';
    push(1, c[2], { quota: ins ? 'In-service' : 'State', institute: college(c[8]), course: subject(c[10]), courseType: /DNB/.test(c[9]) ? 'DNB' : 'MD/MS',
      allottedCategory: CAT24[c[11]] ?? c[11], candidateCategory: (c[4] ?? '').replace(/,$/, ''), inService: ins, upgraded: false, remarks: '', page: 0 });
  }
  for (const c of await rows('or2024_r4_merit_status.pdf')) {
    if (!/^\d+$/.test(c[0] ?? '') || !/^\d{11}$/.test(c[1] ?? '') || !/ODISHA/.test(c[9] ?? '')) continue;
    const round = Number(c[14]);
    if (!(round >= 2)) continue;
    const ins = !!(c[6] ?? '').trim() && !(c[7] ?? '').trim();
    push(round, c[1], { quota: ins ? 'In-service' : 'State', institute: college(c[11]), course: subject(c[12]), courseType: /DNB/.test(c[10]) ? 'DNB' : 'MD/MS',
      allottedCategory: CAT24[c[13]] ?? c[13], candidateCategory: '', inService: ins, upgraded: false, remarks: '', page: 0 });
  }
  const LABEL: Record<number, string> = { 1: 'Round 1', 2: 'Round 2', 3: 'Round 3' };
  for (const [round, out] of [...byRound].sort((a, b) => a[0] - b[0])) {
    out.sort((a, b) => a.rank - b.rank);
    const file = `od2024_r${round}`, src = round === 1 ? 'DMET Odisha: list of candidates admitted in Round 1, 2024' : 'DMET Odisha: state merit list with admission status, before Round 4, 2024';
    writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: src, url: A, counselling: 'Odisha', year: 2024, round: LABEL[round] ?? `Round ${round}`, rows: out }));
    console.log(`${file}: ${out.length} admissions`);
  }
  console.log(`2024: ${noRank} rolls not in the NBEMS result; unmatched names`, [...missing]);
}
