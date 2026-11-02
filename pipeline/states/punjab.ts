/**
 * Punjab NEET PG state counselling (BFUHS, Faridkot) → allotments in the same shape as MCC rounds.
 *
 * BFUHS allotment lists give the state merit number and NEET PG roll number, not the All India Rank:
 *   MNo | Regd No | Rollno | Name | Father Name | Categories | University | Allotted College | Allotted Course | Allotted Quota | Allotted Category | …
 * The round-wise merit lists give each roll number's NEET PG rank (AIR) and whether the candidate is a PCMS
 * (Punjab Civil Medical Services) doctor, who gets incentive marks on the state merit list. The 2025 Round 1 merit
 * list is no longer on the site, so 2025 ranks come from the Round 2 and Round 3 merit lists; allottees missing from
 * both are dropped (counted below).
 *
 * The 2025 Round 2 list has "Shifted …" columns for seats changed after objections; the shifted seat is the final one.
 * Rows whose seat equals the candidate's Round 1 seat are held seats and skipped. Names and roll numbers are never written.
 *
 * Sources: 2026 files are on admission.bfuhsonline.ac.in. The 2025 allotment lists are no longer linked there; they
 * come from Medical Dialogues' copies of the BFUHS PDFs.
 *
 * Usage: tsx pipeline/states/punjab.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/punjab';
const MD = 'https://medicaldialogues.in/pdf_upload/';
const BF = 'https://admission.bfuhsonline.ac.in/';
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, source URL]
  ['pb2025_r1', 2025, 'Round 1', MD + 'revised-provisional-allotment-under-neet-pg-2025-311350.pdf'],
  ['pb2025_r2', 2025, 'Round 2', MD + 'revised-allotment-2nd-round-27122025-317825.pdf'],
  ['pb2026_r1', 2026, 'Round 1', BF + 'PGET2026/MDMS/Provisional%20selection%20list%20for%20admission%20to%20PG%20Courses%20under%20NEET%20PG%202026.pdf'],
];
const MERIT: Record<number, string[]> = { 2025: ['pb2025_merit_r2', 'pb2025_merit_r3'], 2026: ['pb2026_merit_r1'] };
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
// bold text is extracted twice per glyph ("QQuuoottaa"); collapse words made only of doubled letters
const undouble = (w: string) => (w.length >= 4 && w.length % 2 === 0 && [...w].every((c, i) => i % 2 === 1 || c === w[i + 1]) ? w.replace(/(.)\1/g, '$1') : w);
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim().split(' ').map(undouble).join(' ').replace(/^Notification\s+/i, '');
/** Overlapping cells repeat the course prefix ("MD/MS_PaediatMD/MS_Paediat rics"); keep the program and the text after its last copy. */
const courseOf = (s: string) => {
  const c = clean(s).replace(/\s+/g, ''); // words are split mid-way ("Dip loma", "Paediat rics"); course names are matched without spaces
  const prog = /Post_MBBS_DNB/i.test(c) ? 'DNB' : /Post_MBBS_Diploma/i.test(c) ? 'Diploma' : 'MD/MS';
  const tail = c.split(/MD\/MS_|Post_MBBS_DNB_|Post_MBBS_Diploma_/i).pop() ?? c;
  return `${prog}|${tail.trim()}`;
};

async function* tables(file: string) {
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) yield { page: pg.index + 1, rows: gridTable(pg).rows };
}

// ---- roll number → NEET PG rank (AIR) and PCMS (in-service incentive) flag, per year ----
const air = new Map<string, number>(), pcms = new Set<string>();
for (const [year, files] of Object.entries(MERIT)) for (const f of files) {
  let col: Record<string, number> | null = null, n = 0;
  for await (const { rows } of tables(f)) for (const cells of rows) {
    const ks = cells.map(key);
    if (ks.includes('rollno')) { col = { roll: ks.indexOf('rollno'), rank: ks.findIndex((k) => k === 'rank' || k === 'neetpgrank'), pcms: ks.findIndex((k) => k.startsWith('pcmscandida')) }; continue; }
    if (!col || col.rank < 0) continue;
    const roll = (cells[col.roll] ?? '').replace(/\D/g, ''), rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
    if (!/^\d{11}$/.test(roll) || !rank) continue;
    air.set(roll, rank); n++;
    if (/^yes/i.test(clean(cells[col.pcms]))) pcms.add(roll);
  }
  console.log(`${f} (${year}): ${n} roll numbers with a rank`);
}

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const quotas = new Map<string, number>(), cats = new Map<string, number>(), colleges = new Map<string, number>(), courses = new Map<string, number>();
const r1Seat = new Map<string, string>();
const seatKey = (c: string, b: string) => `${key(c)}|${key(b)}`;
for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0, noAir = 0, held = 0;
  for await (const { page, rows } of tables(file)) for (const cells of rows) {
    const ks = cells.map(key);
    if (ks.includes('allottedcollege')) {
      const f = (re: RegExp) => ks.findIndex((k) => re.test(k));
      col = { roll: f(/rollno$/), cat: f(/^categor/), college: f(/^allottedcollege$/), course: f(/^allotted(course|branch)$/), quota: f(/^allottedquota$/), acat: f(/^allottedcategory$/),
        sCollege: f(/^shiftedcollege$/), sCourse: f(/^shiftedspec/), sQuota: f(/^shiftedquota$/), sCat: f(/^shiftedcategory$/) };
      continue;
    }
    if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
    const roll = (cells[col.roll] ?? '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(roll)) continue;
    const get = (i: number) => (i < 0 ? '' : clean(cells[i]));
    const shifted = !!get(col.sCollege);
    const college = shifted ? get(col.sCollege) : get(col.college), course = courseOf(shifted ? get(col.sCourse) : get(col.course));
    const quota = shifted ? get(col.sQuota) : get(col.quota), acat = shifted ? get(col.sCat) : get(col.acat);
    if (!college || /ultrasonograph/i.test(course)) continue; // ultrasonography certificate course, not a PG seat
    listed++;
    const sk = seatKey(college, course);
    if (file === 'pb2025_r1') r1Seat.set(roll, sk);
    else if (year === 2025 && r1Seat.get(roll) === sk) { held++; continue; }
    const rank = air.get(roll);
    if (!rank) { noAir++; continue; }
    bump(quotas, quota); bump(cats, acat); bump(colleges, college); bump(courses, course);
    out.push({ rank, quota, inService: pcms.has(roll), institute: college, course, allottedCategory: acat, candidateCategory: get(col.cat), remarks: shifted ? 'shifted after objections' : '', page });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Punjab', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (${listed} listed, ${held} kept their Round 1 seat, ${noAir} without an AIR)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('quotas', top(quotas));
console.log('categories', top(cats));
console.log('colleges', top(colleges));
console.log('courses', Object.keys(top(courses)).join(' | '));
