/**
 * State counselling tuition fees (yearly) per college × course × seat type → data/parsed/fees_<state><year>.json.
 *
 * Gujarat (ACPPGMEC fee structure 2025, data/raw/states/gujarat/gj2025_fees.pdf): one page per college, header
 *   "Branch | <college name>" then  course | TUTION FEE GQ | TUTION FEE MQ | TUTION FEE NQ  ("-" = no such seat).
 *   Pages are in a fixed order; the college codes below match the codes in the allotment lists.
 * Karnataka fees come straight from the KEA allotment rows (each row prints the seat's fee), so they need no file here.
 *
 * Usage: tsx pipeline/states/fees.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const GJ_PAGES = ['AMED', 'BMED', 'SMED', 'RMED', 'JMED', 'BHMED', 'BHUMED', 'CUMED', 'GCSMED', 'GOTMED', 'KMED', 'NAMOMED', 'NHL', 'SMC', 'SOLMED',
  'GMED', 'PATMED', 'VALMED', 'HIMMED', 'JUMED', 'PRMED', 'MKMED', 'IKDMED', 'VADMED', 'AMRMED', 'NDMED', 'VISMED', 'ANAMED', 'SWAMED', 'KIRMED', 'ZYMED'];
const num = (s: string) => { const n = Number((s ?? '').replace(/[^\d]/g, '')); return n > 0 ? n : null; };

const out: any[] = [];
let page = -1;
for await (const pg of readPages(new Uint8Array(readFileSync('data/raw/states/gujarat/gj2025_fees.pdf')))) {
  for (const c of gridTable(pg).rows) {
    if (c[0] === 'Branch') { page++; continue; }
    if (page < 0 || /TUTION|^$/.test(c[0] ?? '') || c.length < 4) continue;
    const code = GJ_PAGES[page];
    if (!code) throw new Error(`unexpected fee page ${page + 1}`);
    out.push({ collegeCode: code, course: c[0].trim(), GQ: num(c[1]), MQ: num(c[2]), NQ: num(c[3]) });
  }
}
if (page + 1 !== GJ_PAGES.length) throw new Error(`expected ${GJ_PAGES.length} college pages, found ${page + 1}`);
writeFileSync('data/parsed/fees_gj2025.json', JSON.stringify({ source: 'https://www.medadmgujarat.org/pgmed/', state: 'Gujarat', year: 2025, rows: out }));
console.log(`fees_gj2025: ${out.length} course rows for ${page + 1} colleges; courses: ${[...new Set(out.map((r) => r.course))].slice(0, 60).join(' | ')}`);
