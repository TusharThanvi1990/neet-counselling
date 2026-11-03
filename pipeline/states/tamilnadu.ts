/**
 * Tamil Nadu NEET PG state counselling (Selection Committee, tnmedicalselection.net) → allotments in the same shape as
 * MCC rounds.
 *
 * The allotment lists (GQ = government quota, MQ = management quota, PwD) give the state rank (GRANK) and the state
 * application number (ARNO), not the All India Rank:
 *   SNO | GRANK | ARNO | NAME | COMMUNITY | SERVICE | T.MARK | [ALLOTTED FROM] | ALLOTTED TO | CATEGORY | [Status]
 * "ALLOTTED TO" is "GQ - <course> <COLLEGE, PLACE>". The state rank lists map ARNO → NEET roll number, and the NBEMS
 * NEET-PG 2025 result (data/raw/nbems/neetpg2025_air.json, from pipeline/nbems-result.ts) maps roll number → AIR.
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
const ROUNDS: [string, string, string[]][] = [ // [output, round label, list files]
  ['tn2025_r1', 'Round 1', ['tn2025_r1_gq', 'tn2025_r1_mq', 'tn2025_r1_pwd']],
  ['tn2025_r2', 'Round 2', ['tn2025_r2_gq', 'tn2025_r2_mq', 'tn2025_r2_pwd']],
  ['tn2025_r3', 'Round 3', ['tn2025_r3_gq', 'tn2025_r3_mq', 'tn2025_r3_pwd']],
  ['tn2025_stray', 'Stray', ['tn2025_stray_gq', 'tn2025_stray_mq']],
];
const RANKS = ['tn2025_rank_gq', 'tn2025_rank_gq_lp', 'tn2025_rank_mq', 'tn2025_rank_mq_lp'];
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
      if (ks.includes('GRANK') || (ks.includes('RANK') && ks.includes('APPNO'))) { head = ks; continue; }
      if (!head || !/^\d+[A-Z]?$/.test(clean(cells[0]))) continue;
      const r: Record<string, string> = { page: String(pg.index + 1) };
      head.forEach((h, i) => { if (h) r[h] = clean(cells[i]); });
      rows.push(r);
    }
  }
  return rows;
}

const air = JSON.parse(readFileSync('data/raw/nbems/neetpg2025_air.json', 'utf8')) as Record<string, [number, number]>;
const rollOf = new Map<string, string>();
for (const f of RANKS) for (const r of await table(f)) if (r.APPNO && /^\d{11}$/.test(r.NEETROLLNUMBER ?? '')) rollOf.set(r.APPNO, r.NEETROLLNUMBER);
console.log(`ARNO → roll: ${rollOf.size}; NBEMS 2025 roll → AIR: ${Object.keys(air).length}`);

const colleges = new Map<string, number>(), courses = new Map<string, number>();
for (const [out, label, files] of ROUNDS) {
  const rows: any[] = [];
  let listed = 0, retained = 0, noAir = 0;
  for (const f of files) {
    for (const r of await table(f)) {
      const to = r.ALLOTTEDTO ?? '';
      if (!to) continue;
      listed++;
      if (/retain/i.test(r.STATUS ?? '') || (r.ALLOTTEDFROM && key(r.ALLOTTEDFROM) === key(to))) { retained++; continue; }
      const roll = rollOf.get(r.ARNO), rank = roll ? air[roll]?.[0] : undefined;
      if (!rank) { noAir++; continue; }
      const [quota, course, college] = split(to);
      colleges.set(college, (colleges.get(college) ?? 0) + 1); courses.set(course, (courses.get(course) ?? 0) + 1);
      rows.push({ rank, quota, pwd: f.endsWith('_pwd'), institute: college, course, allottedCategory: r.CATEGORY ?? '', candidateCategory: r.COMMUNITY ?? '',
        inService: /service|yes/i.test(r.SERVICE ?? ''), stateRank: r.GRANK, remarks: '', page: Number(r.page) });
    }
  }
  rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: SITE, url: SITE, counselling: 'Tamil Nadu', year: 2025, round: label, rows }));
  console.log(`${out}: ${rows.length} allotments (${listed} listed, ${retained} retained, ${noAir} without an AIR)`);
}
console.log('colleges', Object.fromEntries([...colleges].sort((a, b) => b[1] - a[1])));
console.log('courses', [...courses.keys()].sort().join(' | '));
