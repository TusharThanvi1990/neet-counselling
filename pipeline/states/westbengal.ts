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
  ['wb2025_r2', 2025, 'Round 2', 'wb2025_r2_result', C + '2025/12/20251224980923146.pdf'],
  ['wb2025_stray', 2025, 'Stray', 'wb2025_stray_result', C + '2026/02/202602272073540219.pdf'],
];
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
// a wrapped cell's last line that OCR placed in the next row: [column, fragment at the start of the cell]
const SPILL: [number, RegExp][] = [[5, /^Quota\b\s*/], [6, /^Creamy Layer\)\s*/], [7, /^Creamy Layer\)\s*/], [8, /^Allotment\b\s*/], [0, /^Vacancy\b\s*/]];

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
  const out: any[] = []; let bad = 0;
  for (const r of rows) {
    const rank = Number(r[1].replace(/\D/g, ''));
    if (!rank || !r[3] || !r[4]) { bad++; continue; }
    out.push({
      rank, round: r[0].replace(/[^0-9A-Za-z ]/g, '').trim(), quota: r[5], institute: r[3].toUpperCase().replace(/\bOE\b|(?<=[A-Z])OE(?=[A-Z]{4})/g, 'OF').replace(/GOURLDEVI/, 'GOURIDEVI'),
      course: r[4], allottedCategory: r[6], candidateCategory: r[7], status: r[8], remarks: '', page: 0,
    });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'West Bengal', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments from ${pages.length} OCR pages (${moved} spilled fragments moved back, ${bad} unreadable rows)`);
}
