/**
 * Assam NEET PG state counselling (DME Assam, dme.assam.gov.in) → allotments in the same shape as MCC rounds.
 *
 * Select list (admission notice): Sr | Reg. L Sr | Roll No. + Score | App. No. | State Rank | Name | Category | PWD | SHQ | NEC |
 *   Selection details = "<CCSS> <quota> <subject> <college>" (or "NA - -" when no seat). CC = college code, SS = subject code
 *   (the same subject code in every college, so wrapped / cut subject text is named from the code).
 * The All India Rank comes from the NEET-PG 2025 Assam State Merit List (Roll No | Name | Category | Score | Incentive % |
 * Revised score | NEET-PG 2025 publish rank | …), matched on roll number. SHQ = State Health service (in-service) quota.
 * Only the 2025 Round 2 select list is published as a list; Rounds 1 and 3 and the stray round were notices only.
 * Names are never written.
 *
 * Usage: tsx pipeline/states/assam.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/assam';
const B = 'https://dme.assam.gov.in/sites/default/files/swf_utility_folder/departments/dme_lipl_in_oid_8/latest/';
const ROUNDS: [string, number, string, string, string][] = [ // [out file, year, label, select list PDF, merit list PDF]
  ['as2025_r2', 2025, 'Round 2', 'admission_notice-neet-pg2025_round-2.pdf', 'neet_pg_2025_assam_state_merit_list_final.pdf'],
];
const COLLEGE: Record<string, string> = {
  '01': 'Assam Medical College, Dibrugarh', '02': 'Gauhati Medical College, Guwahati', '03': 'Silchar Medical College, Silchar',
  '04': 'Jorhat Medical College, Jorhat', '05': 'Fakhruddin Ali Ahmed Medical College, Barpeta', '06': 'Tezpur Medical College, Tezpur',
  '07': 'Dr. B. Borooah Cancer Institute, Guwahati', '08': 'Lakhimpur Medical College, North Lakhimpur',
};
const FIX: [RegExp, string][] = [[/^MS OBSTETRICS &?$/, 'MS OBSTETRICS & GYNAECOLOGY'], [/^MD TUBERCULOSIS &?$/, 'MD RESPIRATORY MEDICINE'], [/^MD DERMATOLOGY,?$/, 'MD DERMATOLOGY, VENEREOLOGY & LEPROSY']];
const rows = async (f: string) => { const out: string[][] = []; for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${f}`)))) out.push(...gridTable(pg).rows); return out; };

for (const [file, year, label, list, meritPdf] of ROUNDS) {
  const merit = new Map<string, number>();
  for (const c of await rows(meritPdf)) if (/^\d{8,}$/.test(c[1] ?? '') && /^\d+$/.test(c[7] ?? '')) merit.set(c[1], Number(c[7]));
  const sel = (await rows(list)).filter((c) => /^\d+$/.test(c[0] ?? '') && c.length >= 11);
  // subject code → most common subject text (the text before the college name)
  const votes = new Map<string, Map<string, number>>();
  const parsed = sel.map((c) => {
    const m = c[10].match(/^(\d\d)(\d\d)\s+(\S+)\s+(.*)$/);
    if (!m) return null;
    const [, cc, ss, quota, rest] = m, coll = COLLEGE[cc];
    const subj = rest.replace(/\b(Assam|Gauhati|Silchar|Jorhat|Fakhruddin|Tezpur|Dr\. B\.|Lakhimpur)\b.*$/, '').replace(/^Ph\s+/, '').trim();
    if (/^(MD|MS|DIPLOMA)\b/.test(subj)) { const v = votes.get(ss) ?? new Map(); v.set(subj, (v.get(subj) ?? 0) + 1); votes.set(ss, v); }
    return { roll: c[2].split(' ')[0], stateRank: Number(c[4]), cand: c[6], pwd: c[7] === 'YES', shq: c[8] === 'YES', cc, ss, quota, coll };
  });
  const subject = new Map([...votes].map(([ss, v]) => {
    let s = [...v].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];
    for (const [re, to] of FIX) if (re.test(s)) s = to;
    return [ss, s];
  }));
  const out: any[] = []; let noRank = 0, noSubj = 0, none = 0;
  for (const p of parsed) {
    if (!p) { none++; continue; }
    const rank = merit.get(p.roll), course = subject.get(p.ss);
    if (!rank) { noRank++; continue; }
    if (!course || !p.coll) { noSubj++; continue; }
    out.push({ rank, stateRank: p.stateRank, quota: p.quota, institute: p.coll, collegeCode: p.cc, course, allottedCategory: p.quota, candidateCategory: p.cand, pwd: p.pwd, inService: p.quota === 'SHQ', remarks: '', page: 0 });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: B + list, url: B + list, counselling: 'Assam', year, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments (${none} without a seat, ${noRank} roll not in merit list, ${noSubj} subject/college unknown); merit list ${merit.size}`);
  console.log('subjects', Object.fromEntries(subject));
}
