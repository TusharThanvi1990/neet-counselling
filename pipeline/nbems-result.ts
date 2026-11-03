/**
 * NBEMS NEET-PG result PDF (every candidate: S.No | Application ID | Roll Number | Total Score | Rank)
 * → data/raw/nbems/neetpg<year>_air.json, a roll number → { rank, score } map for state lists that print only roll numbers.
 * Names are not in these PDFs.
 *
 * Usage: tsx pipeline/nbems-result.ts 2025
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from './engine';
import { pageLines } from './textlines';

const year = Number(process.argv[2] ?? 2025);
const yy = String(year).slice(2);
// 2025+: one candidate per line "S.No | Application ID | Roll | Score | Rank".
// 2024: three candidates per line "Applicant ID | Roll | Percentile | Rank"; percentiles are sometimes split ("4. 0543169").
const row = new RegExp(`^\\d+\\s+PG${yy}\\d+\\s+(${yy}\\d{9})\\s+(-?\\d+)\\s+(\\d+)$`);
const row24 = new RegExp(`PG${yy}\\d+\\s+(${yy}\\d{9})\\s+([\\d.\\s]+?)\\s+(\\d+)(?=\\s+PG${yy}|\\s*$)`, 'g');
const air: Record<string, [number, number]> = {};
let pages = 0, rows = 0;
for await (const pg of readPages(new Uint8Array(readFileSync(`data/raw/nbems/neetpg${year}_result.pdf`)))) {
  pages++;
  for (const line of pageLines(pg)) {
    const t = line.words.map((w) => w.text).join(' ').trim();
    if (year === 2024) {
      for (const m of t.matchAll(row24)) { air[m[1]] = [Number(m[3]), Number(m[2].replace(/\s+/g, ''))]; rows++; }
      continue;
    }
    const m = t.match(row);
    if (m) { air[m[1]] = [Number(m[3]), Number(m[2])]; rows++; }
  }
  if (pages % 500 === 0) console.log(`page ${pages}: ${rows} rows`);
}
writeFileSync(`data/raw/nbems/neetpg${year}_air.json`, JSON.stringify(air));
console.log(`${year}: ${rows} candidates from ${pages} pages`);
