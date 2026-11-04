/**
 * Haryana NEET PG state counselling (DMER Haryana / Pt BD Sharma UHS, hry.online-counselling.co.in) → allotments in the
 * same shape as MCC rounds.
 *
 * "Merit List cum Provisional Allotment" (ruled table):
 *   S.No | Application Id | NEET Roll No | Candidate Name | Father's Name | NEET Rank | Allocated College | Allocated Course | Allocated Category
 * NEET Rank is the All India Rank. Candidates without a seat have empty allotment cells. Names, roll numbers and
 * application ids are skipped and never written.
 *
 * The counselling portal was reset for the 2026 session and its file links are short-lived signed URLs, so the 2025
 * Round 1 list comes from Collegedunia's copy of the portal's PDF (ADMINMD12_ALLOCATION_MERIT_REPORT_MD_ROUND_1_2025).
 * Later 2025 rounds were not found.
 *
 * Usage: tsx pipeline/states/haryana.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/haryana';
const ROUNDS: [string, number, string, string][] = [ // [file, year, round label, source URL]
  ['hr2025_r1', 2025, 'Round 1', 'https://image-static.collegedunia.com/public/image/ADMINMD12_ALLOCATION_MERIT_REPORT_MD_ROUND_1_2025_V1_0af95c37508ab594980679633775495a.pdf'],
  // 2024 Round 1 (27-11-2024): DMER's PDF as hosted by UHSR Rohtak, via its Internet Archive copy (UHSR returned 503)
  ['hr2024_r1', 2024, 'Round 1', 'https://uhsr.ac.in/writereaddata/upload/Admissions/271124allocationmdms.pdf'],
  // 2024 Round 2 (23-12-2024, after grievances): only new / upgraded seats are listed; the "Round 2 Allocated …" columns
  // come first, so the header match picks them over the "Round 1 Allocated …" ones. Internet Archive copy (UHSR 503).
  // hr2024_r2_prelim.pdf (PGROUND2ALLOCATION) is the pre-grievance merit list with the same seats plus unallotted rows; not used.
  ['hr2024_r2', 2024, 'Round 2', 'https://uhsr.ac.in/writereaddata/upload/Admissions/231224mdmsallocationround2.pdf'],
  // Round 3 and stray (DMER "Merit List cum Provisional Allotment", 10-02-2025 / 22-02-2025 for 2024-25 and 17-02-2026
  // (revised) / 24-02-2026 for 2025-26). The portal only serves its files through short-lived signed links; these are
  // copies of the DMER PDFs kept on Google Drive by a counselling consultancy's public Telegram channel (t.me/SRISAINEETPG).
  // Round 3 lists every seat holder with the previous allotment beside it: unchanged seats are skipped as held.
  // 2025 Round 2 (ADMINMD12-AllocationMeritReportR2Publish.pdf) is only on the portal's signed links and was not found.
  ['hr2024_r3', 2024, 'Round 3', 'https://drive.google.com/file/d/1ZLCIdktx1Yo0oZRIpcFmzgymjuo1uWve/view'],
  ['hr2024_stray', 2024, 'Stray', 'https://drive.google.com/file/d/1bsFX1OOcdupEuRFbzoCct7NQaC5oRGgk/view'],
  ['hr2025_r3', 2025, 'Round 3', 'https://drive.google.com/file/d/127OkxZjSwAtz5EFlGJk4WIpGYBbDJ-uG/view'],
  ['hr2025_stray', 2025, 'Stray', 'https://drive.google.com/file/d/1pczyBvSpbLXO13acpptRhxn82WnTNW8j/view'],
];
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const cats = new Map<string, number>(), colleges = new Map<string, number>(), courses = new Map<string, number>();
for (const [file, year, label, url] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, listed = 0, held = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('neetrank')) {
        const f = (re: RegExp) => ks.findIndex((k) => re.test(k));
        col = { rank: f(/^neetrank$/), college: f(/allocatedcollege$/), course: f(/allocatedcourse$/), cat: f(/allocatedcategory$/),
          prevCollege: f(/^previous(ly)?allocatedcollege$/), prevCourse: f(/^previous(ly)?allocatedcourse$/) };
        continue;
      }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
      if (!rank) continue;
      listed++;
      // the long MM Sadopur name ("…(PRIVATE UNIVERSITY)") spills into the next row's college cell
      const college = clean(cells[col.college]).replace(/^UNIVERSITY\)\s*/, ''), course = clean(cells[col.course]), cat = clean(cells[col.cat]);
      // ineligible candidates carry a remark ("Minimum qualifying/Eligibility criteria not met") across the allotment cells
      if (!college || /^-+$/.test(college) || !cat || /qualif|regist|eligib|payment/i.test(`${college} ${course}`)) continue;
      if (col.prevCollege >= 0 && key(cells[col.prevCollege]) === key(college) && key(cells[col.prevCourse]) === key(course)) { held++; continue; } // seat kept from an earlier round
      bump(cats, cat); bump(colleges, college); bump(courses, course);
      out.push({ rank, quota: 'State', institute: college, course, allottedCategory: cat, candidateCategory: cat, remarks: '', page: pg.index + 1 });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Haryana', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (of ${listed} listed, ${held} held from an earlier round)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('categories', top(cats));
console.log('colleges', top(colleges));
console.log('courses', Object.keys(top(courses)).join(' | '));
