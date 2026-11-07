/**
 * Tamil Nadu NEET PG state counselling (Selection Committee, tnmedicalselection.net) → allotments in the same shape as
 * MCC rounds.
 *
 * The allotment lists (GQ = government quota, MQ = management quota, PwD) give the state rank (GRANK) and the state
 * application number (ARNO), not the All India Rank:
 *   SNO | GRANK | ARNO | NAME | COMMUNITY | SERVICE | T.MARK | [ALLOTTED FROM] | ALLOTTED TO | CATEGORY | [Status]
 * "ALLOTTED TO" is "GQ - <course> <COLLEGE, PLACE>". The state rank lists map ARNO → NEET roll number, and the NBEMS
 * NEET-PG result of that year (data/raw/nbems/neetpg<year>_air.json, from pipeline/nbems-result.ts) maps roll number → AIR.
 * Later rounds re-list seats kept from earlier rounds ("Retained", or ALLOTTED FROM = ALLOTTED TO); those are skipped.
 * Names are never written.
 *
 * Usage: tsx pipeline/states/tamilnadu.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/tamilnadu';
const SITE = 'https://tnmedicalselection.net/';
const ROUNDS: [string, number, string, string[]][] = [ // [output, year, round label, list files]
  // 2026 Round 1 (05-11-2026; PwD list 31-10-2026), live on tnmedicalselection.net/news/
  ['tn2026_r1', 2026, 'Round 1', ['tn2026_r1_gq', 'tn2026_r1_mq', 'tn2026_r1_pwd']],
  ['tn2025_r1', 2025, 'Round 1', ['tn2025_r1_gq', 'tn2025_r1_mq', 'tn2025_r1_pwd']],
  ['tn2025_r2', 2025, 'Round 2', ['tn2025_r2_gq', 'tn2025_r2_mq', 'tn2025_r2_pwd']],
  ['tn2025_r3', 2025, 'Round 3', ['tn2025_r3_gq', 'tn2025_r3_mq', 'tn2025_r3_pwd']],
  ['tn2025_stray', 2025, 'Stray', ['tn2025_stray_gq', 'tn2025_stray_mq']],
  // 2024-25 session: still on the site under news/<timestamp>.pdf but no longer linked; found through the Internet Archive's
  // captures of the home page's notice list (titles "GQ / MQ / PWD - Provisional List of Candidates allotted …").
  ['tn2024_r1', 2024, 'Round 1', ['tn2024_r1_gq', 'tn2024_r1_mq', 'tn2024_r1_pwd']],
  ['tn2024_r2', 2024, 'Round 2', ['tn2024_r2_gq', 'tn2024_r2_mq', 'tn2024_r2_pwd']],
  ['tn2024_r3', 2024, 'Round 3', ['tn2024_r3_gq', 'tn2024_r3_mq', 'tn2024_r3_pwd']],
  ['tn2024_mopup', 2024, 'Mop-up', ['tn2024_mopup_gq', 'tn2024_mopup_mq']],
  ['tn2024_stray', 2024, 'Stray', ['tn2024_stray_gq', 'tn2024_stray_mq']],
  ['tn2024_sstray', 2024, 'Special stray', ['tn2024_sstray_gq', 'tn2024_sstray_mq']],
];
const RANKS: Record<number, string[]> = {
  // provisional rank lists (28-10-2026) and their addenda (29-10, 31-10, 02-11-2026)
  2026: ['tn2026_rank_gq', 'tn2026_rank_mq', 'tn2026_rank_gq_a1', 'tn2026_rank_gq_a2', 'tn2026_rank_gq_a3', 'tn2026_rank_mq_a1'],
  2025: ['tn2025_rank_gq', 'tn2025_rank_gq_lp', 'tn2025_rank_mq', 'tn2025_rank_mq_lp'],
  // provisional rank lists (16-11-2024), their addenda and the revised GQ state merit lists after the percentile cut-off fell
  2024: ['tn2024_rank_gq', 'tn2024_rank_mq', 'tn2024_rank_gq_a1', 'tn2024_rank_mq_a1', 'tn2024_rank_gq_a2', 'tn2024_rank_mq_a2', 'tn2024_rank_gq_a3',
    'tn2024_rank_gq_a4', 'tn2024_rank_gq_rev1', 'tn2024_rank_mq_a3', 'tn2024_rank_gq_rev2', 'tn2024_rank_mq_a4'],
};
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
// uppercase words that belong to course names, not college names
const COURSE_CAPS = /^(D\.?V\.?L|E\.?N\.?T|ENT|DVL|TB|O&G|OG|IHBT|\(?NBEMS\)?|DNB|M\.D\.|M\.S\.|MD|MS|&|AND|OF|IN|-)$/;

/** "GQ - M.D. Radio Diagnosis MADRAS MEDICAL COLLEGE, CHENNAI" → [quota, course, college] */
function split(s: string): [string, string, string] {
  const m = clean(s).replace(/^NRI Category\s*/, 'NRI - ').match(/^(GQ|MQ|NRI|SQ|[A-Z]{2,4})\s*-\s*(.+)$/);
  if (!m) return ['', '', ''];
  const words = m[2].split(' ');
  let i = 1;
  for (; i < words.length; i++) {
    const rest = words.slice(i).join(' ');
    if (!/[a-z]/.test(rest) && !COURSE_CAPS.test(words[i]) && /[A-Z]{3,}/.test(words[i])) break;
  }
  return [m[1], words.slice(0, i).join(' '), words.slice(i).join(' ')];
}

async function table(file: string) {
  const rows: Record<string, string>[] = [];
  let head: string[] | null = null;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('GRANK') || (ks.includes('RANK') && (ks.includes('APPNO') || ks.includes('ARNO')))) { head = ks; continue; } // 2024 R1: RANK | ARNO
      if (!head || !/^\d+[A-Z]?$/.test(clean(cells[0]))) continue;
      const r: Record<string, string> = { page: String(pg.index + 1) };
      head.forEach((h, i) => { if (h) r[h] = clean(cells[i]); });
      rows.push(r);
    }
  }
  return rows;
}

// per year: ARNO → NEET roll (state rank lists) and roll → AIR (NBEMS result of that year)
const airOf = new Map<number, Record<string, [number, number]>>(), rollOfYear = new Map<number, Map<string, string>>();
for (const [year, files] of Object.entries(RANKS)) {
  const y = Number(year), rollOf = new Map<string, string>();
  // any row holding an application number ("24PG…") and an 11-digit NEET roll number: the first page of each rank list has
  // its column header merged into the title block, so rows are not matched by header
  for (const f of files) for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${f}.pdf`)))) for (const cells of gridTable(pg).rows) {
    const c = cells.map(clean), app = c.find((x) => /^\d{2}PG\d+$/.test(x)), roll = c.find((x) => /^\d{11}$/.test(x));
    if (app && roll) rollOf.set(app, roll);
  }
  rollOfYear.set(y, rollOf);
  airOf.set(y, JSON.parse(readFileSync(`data/raw/nbems/neetpg${y}_air.json`, 'utf8')));
  console.log(`${y}: ARNO → roll ${rollOf.size}; NBEMS roll → AIR ${Object.keys(airOf.get(y)!).length}`);
}

const colleges = new Map<string, number>(), courses = new Map<string, number>();
for (const [out, year, label, files] of ROUNDS) {
  const rows: any[] = [], rollOf = rollOfYear.get(year)!, air = airOf.get(year)!;
  let listed = 0, retained = 0, noAir = 0;
  for (const f of files) {
    for (const r of await table(f)) {
      const to = r.ALLOTTEDTO ?? '';
      if (!to) continue;
      listed++;
      if (/retain/i.test(r.STATUS ?? '') || (r.ALLOTTEDFROM && key(r.ALLOTTEDFROM) === key(to))) { retained++; continue; }
      const roll = rollOf.get(r.ARNO ?? r.APPNO), // 2026 lists head the column "APP. NO"
        rank = roll ? air[roll]?.[0] : undefined;
      if (!rank) { noAir++; continue; }
      // the 2024 Round 1 MQ list prints "M.D. … COLLEGE" without the "MQ - " prefix: take the quota from the list
      const [quota, course, college] = split(/^(GQ|MQ|NRI|SQ|[A-Z]{2,4})\s*-/.test(clean(to)) ? to : `${f.endsWith('_mq') ? 'MQ' : 'GQ'} - ${to}`);
      colleges.set(college, (colleges.get(college) ?? 0) + 1); courses.set(course, (courses.get(course) ?? 0) + 1);
      rows.push({ rank, quota, pwd: f.endsWith('_pwd'), institute: college, course, allottedCategory: r.CATEGORY ?? '', candidateCategory: r.COMMUNITY ?? r.COMM ?? '',
        inService: /service|yes/i.test(r.SERVICE ?? ''), stateRank: r.GRANK, remarks: '', page: Number(r.page) });
    }
  }
  rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: SITE, url: SITE, counselling: 'Tamil Nadu', year, round: label, rows }));
  console.log(`${out}: ${rows.length} allotments (${listed} listed, ${retained} retained, ${noAir} without an AIR)`);
}
console.log('colleges', Object.fromEntries([...colleges].sort((a, b) => b[1] - a[1])));
console.log('courses', [...courses.keys()].sort().join(' | '));
