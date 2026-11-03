/**
 * Goa NEET PG state counselling (DTE Goa, dte.goa.gov.in) → allotments in the same shape as MCC rounds.
 *
 * DTE's "Merit cum Allotment List" (ruled table) covers the state-quota seats of Goa Medical College:
 *   Merit No | Reg No | Name | Course Allotted (code) | Allotted Category | Group | NEET PG Rank | SR / OCNA
 * (2026 lists: Merit No | Reg No | Name | Category 1 | Category 2 | NEET PG Rank | Course Allotted.)
 * Course codes (ANA, MED, RDG, …) are named in the programme table at the start of each list. Groups I–IV are DTE's
 * priority groups (Goa-domicile preference). "SR" marks a seat retained from an earlier round; those rows are skipped.
 * Names are never written.
 *
 * Usage: tsx pipeline/states/goa.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/goa';
const F = 'https://dte.goa.gov.in/sites/default/files/';
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, official URL]
  ['ga2025_r2', 2025, 'Round 2', F + 'pgmedallotrnd2.pdf'],
  ['ga2025_r3', 2025, 'Round 3', F + 'pgmedallotrnd3.pdf'],
  ['ga2026_r1', 2026, 'Round 1', F + 'pgmed2026.pdf'],
];
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
// programme codes (same every year; the 2025 lists print the table in a layout the grid reader cannot split)
const CODES: Record<string, string> = { ANA: 'ANAESTHESIOLOGY', ANT: 'ANATOMY', BCH: 'BIOCHEMISTRY', DER: 'DERMATOLOGY', FRM: 'FORENSIC MEDICINE', MED: 'GENERAL MEDICINE', SUR: 'GENERAL SURGERY', GER: 'GERIATRICS', MBG: 'MICROBIOLOGY', OBG: 'OBSTETRICS & GYNAECOLOGY', OPT: 'OPHTHALMOLOGY', ORT: 'ORTHOPAEDICS', ORG: 'OTORHINOLARYNGOLOGY (ENT)', PDS: 'PAEDIATRICS', PAT: 'PATHOLOGY', PHM: 'PHARMACOLOGY', PHY: 'PHYSIOLOGY', COM: 'PSM (COMMUNITY MEDICINE)', PSY: 'PSYCHIATRY', RDG: 'RADIOLOGY (RADIO DIAGNOSIS)', RBM: 'TB (RESPIRATORY MEDICINE)', TFM: 'TRANSFUSION MEDICINE (IHBT)' };
const regRank = new Map<string, number>(); // `${year}|${reg}` → NEET PG rank (Round 3 lists omit the rank)
const codesSeen = new Map<string, string>(), cats = new Map<string, number>(), groups = new Map<string, number>();
for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  const names = new Map<string, string>();
  let col: Record<string, number> | null = null, group = '', listed = 0, retained = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      // programme table: NAME OF PG DEGREE PROG. | NOS. OF SEATS | PROGRAMME CODE
      if (ks.some((k) => k.startsWith('NAMEOFPGDEGREE'))) { col = null; continue; }
      if (cells.length === 3 && /^[A-Z]{2,4}$/.test(clean(cells[2])) && !/^\d+$/.test(cells[0] ?? '')) { names.set(clean(cells[2]), clean(cells[0])); continue; }
      if (ks.includes('MERITNO')) {
        const f = (re: RegExp) => ks.findIndex((k) => re.test(k));
        col = { reg: f(/^REGNO/), course: f(/^(COURSE|SEAT)ALLOTTED/), cat: f(/CATEGO|^CATEGORY1$/), group: f(/GROUP|^OUPI/), rank: f(/NEETPGRANK/), sr: f(/^SR|^SEATSTATUS/) };
        continue;
      }
      const g = clean(cells.join(' ')).match(/^GROUP\s+(I{1,3}V?|IV)$/);
      if (g) { group = g[1]; continue; }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const reg = clean(cells[col.reg]), code = clean(cells[col.course]);
      let rank = col.rank >= 0 ? Number((cells[col.rank] ?? '').replace(/\D/g, '')) : 0;
      if (rank) regRank.set(`${year}|${reg}`, rank); else rank = regRank.get(`${year}|${reg}`) ?? 0;
      if (!rank || !CODES[code]) continue; // no seat, or OCNA (opted choices not available)
      listed++;
      if (col.sr >= 0 && /^SR$|retained/i.test(clean(cells[col.sr]))) { retained++; continue; }
      const cat = clean(cells[col.cat]), grp = col.group >= 0 ? clean(cells[col.group]) || group : group;
      bump(cats, cat); bump(groups, grp);
      out.push({ rank, quota: 'State', institute: 'GOA MEDICAL COLLEGE', courseCode: code, course: names.get(code) ?? CODES[code], allottedCategory: cat, candidateCategory: cat, group: grp, remarks: '', page: pg.index + 1 });
    }
  }
  for (const [c, n] of names) codesSeen.set(c, n);
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Goa', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (${listed} listed, ${retained} seat retained), ${names.size} course codes`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('categories', top(cats));
console.log('groups', top(groups));
console.log('codes', Object.fromEntries(codesSeen));

// ---- 2024 (Internet Archive copies of the DTE files; the site reuses file names every year) ----
// The 2024 lists are cumulative: every merit-list candidate with the seat they hold after that round (Round 2's list
// was never archived, so Round 3 changes include Round 2's). A seat counts for a round only when it differs from the
// candidate's seat in the previous list. Header rows are split over two lines, so cells are found by content:
// [Merit No, Reg No, (Name), NEET PG AIR, Category, (Category 2), Course code, (Allotted category), (Remarks)].
const A = 'https://web.archive.org/web/';
const R24: [string, string, string][] = [
  ['ga2024_a', 'Round 1', A + '20250828102418/https://dte.goa.gov.in/sites/default/files/pgmedseatallotment2024.pdf'],
  ['ga2024_c', 'Round 3', A + '20250828100722/https://dte.goa.gov.in/sites/default/files/pgmedallotrd3.pdf'],
  ['ga2024_stray', 'Stray', A + '20250828102428/https://dte.goa.gov.in/sites/default/files/pgmedseatallotystrayrnd.pdf'],
  ['ga2024_sstray', 'Special stray', A + '20250319040628/https://dte.goa.gov.in/sites/default/files/pgmedspstrayrnd.pdf'],
];
const OUT24: Record<string, string> = { ga2024_a: 'ga2024_r1', ga2024_c: 'ga2024_r3', ga2024_stray: 'ga2024_stray', ga2024_sstray: 'ga2024_sstray' };
const air24 = new Map<string, number>(); // reg no → AIR, from the state merit list
for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/ga2024_merit.pdf`)))) {
  for (const cells of gridTable(pg).rows) {
    const c = cells.map(clean);
    if (/^\d+$/.test(c[0]) && /^\d+$/.test(c[1]) && /^\d+$/.test(c[c.length - 1])) air24.set(c[1], Number(c[c.length - 1]));
  }
}
console.log(`2024 merit list: ${air24.size} reg nos with an AIR`);
const held = new Map<string, string>();
for (const [file, label, url] of R24) {
  const out: any[] = [];
  let listed = 0, same = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const c = cells.map(clean);
      while (c.length && c[0] === '') c.shift();
      if (!/^\d+$/.test(c[0] ?? '') || !/^\d{3}$/.test(c[1] ?? '')) continue;
      const reg = c[1], ci = c.findIndex((x, i) => i > 1 && !!CODES[x]);
      if (ci < 0) continue; // no seat (blank or OCNA)
      const ri = c.findIndex((x, i) => i > 1 && /^\d+$/.test(x));
      const rank = air24.get(reg) ?? (ri >= 0 && ri < ci ? Number(c[ri]) : 0);
      if (!rank) continue;
      listed++;
      const code = c[ci], cat = c[ri + 1] || 'GEN', acat = c[ci + 1] && /^[A-Z/]{2,}$/.test(c[ci + 1]) ? c[ci + 1] : cat;
      const seat = `${code}|${acat}`;
      if (held.get(reg) === seat) { same++; continue; }
      held.set(reg, seat);
      out.push({ rank, quota: 'State', institute: 'GOA MEDICAL COLLEGE', courseCode: code, course: CODES[code], allottedCategory: acat, candidateCategory: cat, remarks: '', page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${OUT24[file]}.json`, JSON.stringify({ source: url, url, counselling: 'Goa', year: 2024, round: label, rows: out }));
  console.log(`${OUT24[file]}: ${out.length} new seats (${listed} listed, ${same} held from the previous list)`);
}
