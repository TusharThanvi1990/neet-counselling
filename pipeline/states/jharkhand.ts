/**
 * Jharkhand NEET PG state counselling (JCECEB, jceceb.jharkhand.gov.in) → allotments in the same shape as MCC rounds.
 *
 * "Provisional Seat Allotment List through <n> Round of Online Counselling for Admission to State Quota PG Medical" (ruled):
 *   Sl. No. | App. No. | NEET PG Roll No. | Name | [Father's / Mother's Name] | Gender | D.O.B. | Category | Is EWS | Is PTG |
 *   PTG Type | [Is PWD | Type of Disability] | % of incentive marks | CML Rank | Category / EWS / PTG / PWD Rank |
 *   College / Allotted Institute | Allotted Course | Roster Point | Seat Allotted (Opted) Category |
 *   [Previous Allotted Institute | Previous Allotted Course | Previous Allotted Category]
 * Columns differ a little between files, so they are found by header. AIR comes from the NBEMS NEET-PG result of the year
 * (data/raw/nbems/neetpg<year>_air.json) by roll number. Incentive marks > 0 = in-service doctors (their CML rank includes
 * the incentive). Later rounds list seats already held: a row whose seat equals the previous one is skipped.
 * Names, roll numbers, dates of birth and application numbers are never written.
 *
 * Sources: jceceb.jharkhand.gov.in/download/<id>.pdf (ids found through links posted on t.me/SRISAINEETPG).
 *
 * Usage: tsx pipeline/states/jharkhand.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/jharkhand';
const J = 'https://jceceb.jharkhand.gov.in/download/';
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, official PDF]
  ['jh2024_r1', 2024, 'Round 1', J + '1666.pdf'], // 27-11-2024
  ['jh2024_r2', 2024, 'Round 2', J + '1682.pdf'], // 23-12-2024
  ['jh2024_r3', 2024, 'Round 3', J + '1690.pdf'], // 09-02-2025 (revised)
  ['jh2024_stray', 2024, 'Stray', J + '1692.pdf'], // 26-02-2025
  ['jh2024_sstray', 2024, 'Special stray', J + '1700.pdf'], // 17-03-2025
  ['jh2025_r1', 2025, 'Round 1', J + '1953.pdf'], // 28-11-2025
  ['jh2025_r2', 2025, 'Round 2', J + '1997.pdf'], // 22-12-2025
  ['jh2026_r1', 2026, 'Round 1', J + '2276.pdf'], // 03-11-2026
];
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const airs = new Map<number, Record<string, [number, number]>>();
const colleges = new Map<string, number>(), courses = new Map<string, number>(), seats = new Map<string, number>();

for (const [file, year, label, url] of ROUNDS) {
  if (!airs.has(year)) airs.set(year, JSON.parse(readFileSync(`data/raw/nbems/neetpg${year}_air.json`, 'utf8')));
  const air = airs.get(year)!;
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0, held = 0, noAir = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.some((k) => /rollno$/.test(k))) {
        const f = (re: RegExp) => ks.findIndex((k) => re.test(k));
        col = { roll: f(/rollno$/), cat: f(/^category$/), ews: f(/^isews$/), pwd: f(/^ispwd$/), inc: f(/incentive/),
          college: f(/^(collegename|allottedinstitute)$/), course: f(/^(course|allottedcourse)$/), seat: f(/^seat(allotted|opted)category$/),
          prevCollege: f(/^previousallotted(institute|college)$/), prevCourse: f(/^previousallottedcourse$/) };
        continue;
      }
      if (!col || !/^\d+$/.test(clean(cells[0]))) continue;
      const college = clean(cells[col.college]), course = clean(cells[col.course]);
      if (!college || /^-+$/.test(college)) continue;
      listed++;
      if (col.prevCollege >= 0 && key(cells[col.prevCollege]) === key(college) && key(cells[col.prevCourse]) === key(course)) { held++; continue; }
      const roll = clean(cells[col.roll]).replace(/\D/g, ''), rank = air[roll]?.[0];
      if (!rank) { noAir++; continue; }
      const seat = clean(cells[col.seat]), inc = col.inc >= 0 ? Number(clean(cells[col.inc]).replace(/[^\d.]/g, '') || 0) : 0;
      const pwd = col.pwd >= 0 && /^yes/i.test(clean(cells[col.pwd]));
      bump(colleges, college); bump(courses, course); bump(seats, seat);
      out.push({ rank, quota: 'State', institute: college, course, allottedCategory: seat, candidateCategory: clean(cells[col.cat]),
        ews: col.ews >= 0 && /^yes/i.test(clean(cells[col.ews])), pwd, inService: inc > 0, remarks: '', page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Jharkhand', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (${listed} listed, ${held} kept an earlier seat, ${noAir} roll not in the NBEMS result)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('seat categories', top(seats));
console.log('colleges', top(colleges));
console.log('courses', Object.keys(top(courses)).join(' | '));
