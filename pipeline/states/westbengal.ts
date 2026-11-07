/**
 * West Bengal NEET PG state counselling (WBMCC, wbmcc.nic.in) → allotments in the same shape as MCC rounds.
 *
 * WBMCC's result PDFs use fonts with no text mapping, so they are read with NamahaPDF's OCR, one column strip at a time
 * inside the PDF's own ruling lines (pipeline/ocr-grid.ts → data/raw/states/westbengal/ocr/<file>_grid_p<n>.json).
 *   ROUND | ALL INDIA RANK | CHOICE NO. | INSTITUTE | COURSE | ALLOTTED QUOTA | ALLOTTED CATEGORY | CANDIDATE CATEGORY | STATUS
 * The Round 2 result lists every seat held after Round 2 (Round 1 seats Retained / Not Upgraded, plus Round 2 Fresh
 * Allotment / Upgraded), which is what the site's "after Round 2" closing rank needs. The ranks are All India Ranks.
 * Files were found through Internet Archive snapshots of the PG Medical page; the PDFs themselves are on WBMCC's CDN.
 * No names are printed in these results.
 *
 * Usage: tsx pipeline/states/westbengal.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const OCR = 'data/raw/states/westbengal/ocr';
const C = 'https://cdnbbsr.s3waas.gov.in/s3aae8d1e00b15a30e5901227e97ffbef7/uploads/';
const ROUNDS: [string, number, string, string, string][] = [ // [out, year, label, OCR name, official URL]
  // 2026 Round 1 (04-11-2026): live on WBMCC's CDN (linked from wbmcc.nic.in/pg-medical-counselling/), text readable, grids by grid-json.ts
  ['wb2026_r1', 2026, 'Round 1', 'wb2026_r1_result', C + '2026/11/202611041797935242.pdf'],
  // 2025 Round 1 (26-11-2025): WBMCC's PDF (Reporting Services, text readable, grids by pipeline/grid-json.ts) via the Google
  // Drive copy linked from pw.live; the WBMCC CDN file was not found. Being first for 2025, Round 2's Retained rows are skipped.
  ['wb2025_r1', 2025, 'Round 1', 'wb2025_r1_result', 'https://drive.google.com/file/d/1uzQF46Adnj4ARWpy6B9hzL9iV0RlJiyn/view'],
  ['wb2025_r2', 2025, 'Round 2', 'wb2025_r2_result', C + '2025/12/20251224980923146.pdf'],
  // 2025 Round 3 (16-02-2026), on WBMCC's CDN (link found in Collegedunia's Round 3 article); text readable, grids by grid-json.ts
  ['wb2025_r3', 2025, 'Round 3', 'wb2025_r3_result', C + '2026/02/202602161760928463.pdf'],
  ['wb2025_stray', 2025, 'Stray', 'wb2025_stray_result', C + '2026/02/202602272073540219.pdf'],
  // 2024: Internet Archive copies of wbmcc.nic.in/PGMed/Documents result PDFs (text PDFs, grids written by pipeline/grid-json.ts).
  // The Round 2 list includes Round 1 seats that were kept (skipped there, since Round 1 is now present).
  ['wb2024_r1', 2024, 'Round 1', 'wb2024_r1_result', 'https://web.archive.org/web/20241202222356/https://wbmcc.nic.in/PGMed/Documents/WBPG_MED_Result_R1_2024_fbhdhfhgafhf654654hgvhg65.pdf'],
  ['wb2024_r2', 2024, 'Round 2', 'wb2024_r2_result', 'https://web.archive.org/web/20250116113513/https://wbmcc.nic.in/PGMed/Documents/WBPG_MED_Result_R2_2024_asdasd3463464ghkjjhkfgjh.pdf'],
  ['wb2024_r3', 2024, 'Round 3', 'wb2024_r3_result', 'https://web.archive.org/web/20250321232238/https://wbmcc.nic.in/PGMed/Documents/WBPG_MED_Result_R3_2024_dfdsfdsfdsf4567657ghjhgj.pdf'],
  ['wb2024_stray', 2024, 'Stray', 'wb2024_stray_result', 'https://web.archive.org/web/20250226054001/https://wbmcc.nic.in/PGMed/Documents/WBPG_MED_Result_Stray_Round_2024_asdasd343534fgjfgjhg.pdf'],
  ['wb2024_sstray', 2024, 'Special stray', 'wb2024_sstray_result', 'https://web.archive.org/web/20250430011054/https://wbmcc.nic.in/PGMed/Documents/WBPG_MED_Result_Special_Stray_Round_2024_asdsadsad3465445fghjfgh.pdf'],
];
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
// a wrapped cell's last line that OCR placed in the next row: [column, fragment at the start of the cell]
const SPILL: [number, RegExp][] = [[5, /^Quota\b\s*/], [6, /^Creamy Layer\)\s*/], [7, /^Creamy Layer\)\s*/], [8, /^Allotment\b\s*/], [0, /^Vacancy\b\s*/]];

const firstOfYear = new Set([...new Map(ROUNDS.map((r) => [r[1], r[0]] as const)).values()].length ? ROUNDS.filter((r, i) => ROUNDS.findIndex((x) => x[1] === r[1]) === i).map((r) => r[0]) : []);
for (const [file, year, label, name, url] of ROUNDS) {
  const pages = readdirSync(OCR).filter((f) => f.startsWith(`${name}_grid_p`)).sort((a, b) => Number(a.match(/p(\d+)/)![1]) - Number(b.match(/p(\d+)/)![1]));
  const rows: string[][] = [];
  for (const f of pages) for (const r of JSON.parse(readFileSync(`${OCR}/${f}`, 'utf8')).rows as string[][]) if (r.length === 9 && !/^ROUND/.test(r[0])) rows.push(r.map(clean));
  let moved = 0;
  for (let i = 1; i < rows.length; i++) {
    for (const [c, re] of SPILL) {
      const m = rows[i][c].match(re);
      if (m) { rows[i - 1][c] = clean(`${rows[i - 1][c]} ${m[0]}`); rows[i][c] = clean(rows[i][c].slice(m[0].length)); moved++; }
    }
    // course: a bare "M.S." / "M.D." whose "(SUBJECT)" line landed at the start of the next row's course
    const m = rows[i][4].match(/^\([^()]+\)\s*(?=M\.|\(NBEMS|DIP)/);
    if (m && /^M\.[DS]\.?$/.test(rows[i - 1][4])) { rows[i - 1][4] = clean(`${rows[i - 1][4]} ${m[0]}`); rows[i][4] = clean(rows[i][4].slice(m[0].length)); moved++; }
    // course: an unclosed "(" whose closing words landed at the start of the next row ("M.D. (GENERAL" + "MEDICINE) M.S. …")
    const open = (s: string) => (s.match(/\(/g)?.length ?? 0) > (s.match(/\)/g)?.length ?? 0);
    const tail = rows[i][4].match(/^[^()]+\)\s*(?=\S)/);
    if (tail && open(rows[i - 1][4])) { rows[i - 1][4] = clean(`${rows[i - 1][4]} ${tail[0]}`); rows[i][4] = clean(rows[i][4].slice(tail[0].length)); moved++; }
  }
  const out: any[] = []; let bad = 0, held = 0;
  for (const r of rows) {
    const rank = Number(r[1].replace(/\D/g, ''));
    if (!rank || !r[3] || !r[4]) { bad++; continue; }
    // after the first round we have for a year, seats kept from an earlier round are already counted there
    if (!firstOfYear.has(file) && /^(Retained|Not Upgraded)$/i.test(r[8])) { held++; continue; }
    out.push({
      rank, round: r[0].replace(/[^0-9A-Za-z ]/g, '').trim(), quota: r[5], institute: r[3].toUpperCase().replace(/\bOE\b|(?<=[A-Z])OE(?=[A-Z]{4})/g, 'OF').replace(/GOURLDEVI/, 'GOURIDEVI'),
      course: r[4], allottedCategory: r[6], candidateCategory: r[7], status: r[8], remarks: '', page: 0,
    });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'West Bengal', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments from ${pages.length} OCR pages (${moved} spilled fragments moved back, ${bad} unreadable rows, ${held} kept from an earlier round)`);
}
