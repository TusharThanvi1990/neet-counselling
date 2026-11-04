/**
 * Uttar Pradesh NEET PG state counselling (DGME UP, upneet.gov.in) → allotments in the same shape as MCC rounds.
 *
 * Allotments: upneet.gov.in → Allotted Candidate List → "UP NEET PG Counseling For MDMS (MEDICAL)" →
 * Institute Wise Allotted Candidates (one ASP.NET page per institute, saved as data/raw/states/up/<round>/<code>.html):
 *   Branch Name | Serial No. | Round + Allotted Category (e.g. "Round1 UROP") | Roll no | Name | Father's Name | Rank | Date | Left Inst | Left Course
 * The "Rank" column is the UP state merit position, so the All India Rank comes from the UP State Merit List PDF
 * (Roll no | Name | Father | UP Category | UP Sub Category | NEET Marks | NEET Rank | Marks with weightage | Weightage %),
 * matched on roll number. Weightage > 0 = PMHS in-service doctors (bonus marks).
 * Allotted category = 2-letter category + 2-letter sub-category: UR/EW/BC/SC/ST (+ BS/SS, printed as-is) and OP (open) / PH (PwD).
 * Names are never written.
 *
 * Usage: tsx pipeline/states/up.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/up';
const ROUNDS: [string, number, string, string, string][] = [ // [file, year, round label, allotment folder, merit list PDF]
  ['up2026_r1', 2026, 'Round 1', '2026_r1', 'up2026_r1_merit_mdms.pdf'],
  // 2025 Round 1 (26-11-2025): the upneet pages were replaced by the 2026 session. A counselling consultancy's public Google
  // Sheet (docs.google.com/spreadsheets/d/1cDk5c6mtOb5ecPKCtb5Ft_fd7LxokmhU, shared on t.me/SRISAINEETPG) is an export of
  // those pages with the same columns; its 2026 Round 1 sheet matched our own 2026 scrape on all 2,832 rows (branch, round
  // + category, roll, state position). Converted to a TSV by up-sheet.py. Merit lists: DGME UP's MERIT_PG_MDMS2025_Round1/2/3.pdf (dgme.up.gov.in/assets/admin/news/), Round 1 first.
  ['up2025_r1', 2025, 'Round 1', '2025_r1', 'up2025_r1_merit_mdms.pdf,up2025_r2_merit_mdms.pdf,up2025_r3_merit_mdms.pdf'],
];
const SHEET_SOURCE: Record<string, string> = { up2025_r1: 'https://docs.google.com/spreadsheets/d/1cDk5c6mtOb5ecPKCtb5Ft_fd7LxokmhU' };
const URL = 'https://upneet.gov.in/vaccant_result/onallotmainCStatus.aspx';
const clean = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

for (const [file, year, label, dir, meritPdf] of ROUNDS) {
  // roll → merit entry
  const merit = new Map<string, { air: number; cat: string; sub: string; weight: number; pos: number }>();
  // several merit lists (comma-separated): the first one that lists a roll number wins (later lists add late registrants)
  for (const pdf of meritPdf.split(',')) for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${pdf}`)))) {
    for (const c of gridTable(pg).rows) {
      if (!/^\d+$/.test(c[0] ?? '') || !/^\d{8,}$/.test(c[1] ?? '') || merit.has(c[1])) continue;
      merit.set(c[1], { pos: Number(c[0]), cat: c[4], sub: c[5], air: Number(c[7]), weight: Number(c[9] ?? 0) });
    }
  }
  const out: any[] = [];
  const cats = new Map<string, number>(); let noRoll = 0, posMismatch = 0;
  // each source: institute heading "(001) NAME [Govt.]" + rows of cells [branch, serial, "Round1 UROP", roll, name, father, state position]
  const sources: [string, string[][]][] = [];
  for (const f of readdirSync(`${RAW}/${dir}`).sort()) {
    if (f.endsWith('.html')) {
      const s = readFileSync(`${RAW}/${dir}/${f}`, 'utf8');
      sources.push([s.slice(s.indexOf('List of Allotted Candidates')), [...s.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((tr) => [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => clean(m[1])))]);
    } else if (f.endsWith('.tsv')) { // up-sheet.py output: branch, round + category, roll, state position, institute heading
      const byInst = new Map<string, string[][]>();
      for (const l of readFileSync(`${RAW}/${dir}/${f}`, 'utf8').trim().split('\n')) {
        const [branch, round, roll, pos, inst] = l.split('\t');
        (byInst.get(inst) ?? byInst.set(inst, []).get(inst)!).push([branch, '', round, roll, '', '', pos]);
      }
      for (const [inst, rows] of byInst) sources.push([inst, rows]);
    }
  }
  for (const [heading, rows] of sources) {
    const head = heading.match(/\((\d{3})\)\s*([^<]+?)\s*\[(Govt\.|Private)\]/);
    if (!head) continue;
    const [, code, name, type] = head;
    for (const c of rows) {
      if (c.length < 7 || !/^Round/.test(c[2])) continue;
      const seat = c[2].split(' ').pop()!, roll = c[3], m = merit.get(roll);
      if (!m) { noRoll++; continue; }
      if (m.pos !== Number(c[6])) posMismatch++;
      bump(cats, seat);
      out.push({
        rank: m.air, statePos: Number(c[6]), quota: type === 'Govt.' ? 'Govt' : 'Private', institute: clean(name), collegeCode: code,
        course: c[0], allottedCategory: seat, candidateCategory: `${m.cat}${m.sub}`, inService: m.weight > 0, remarks: '', page: 0,
      });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: URL, url: SHEET_SOURCE[file] ?? URL, counselling: 'Uttar Pradesh', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments; merit list ${merit.size}; roll not in merit list ${noRoll}; state position ≠ merit position ${posMismatch}; in-service ${out.filter((r) => r.inService).length}`);
  console.log('seat categories', Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])));
  console.log('sample', out.slice(0, 3), out.at(-1));
}
