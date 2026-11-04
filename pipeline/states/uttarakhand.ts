/**
 * Uttarakhand NEET PG state counselling (H.N.B. Uttarakhand Medical Education University, Dehradun; counselling portal
 * meta-secure.com/HNBUMU_MDMS) → allotments in the same shape as MCC rounds.
 *
 * Each round publishes a "Provisional complete broad sheet": every candidate on the state merit list, in state-rank order,
 * with all opted choices one per line and the allotted seat (if any) on the first line:
 *   State Rank | NEET Rollno | Name | NEET Rank | Domicile of UK | MBBS pass state | PMHS, UK | Claimed category | (UK) Category |
 *   Subcategory | Gender | [Bonded] | [NEET marks] | % incentive marks | [Final marks] | Opted preference | Opted college/seat |
 *   Alloted quota | Alloted category | Alloted college/seat ("<course>-<college>-(<status>-<quota>)") | Alloted preference | Remarks
 * Columns are found by header. Text of a long cell wraps onto the next line(s), so continuation lines are appended to the
 * candidate above. The NEET rank printed is the All India Rank. PMHS (Provincial Medical Health Service) doctors with
 * incentive marks rank on boosted marks, so their seats are kept apart as in-service. NRI rounds are separate sheets.
 * A seat equal to the one the candidate held after the previous round of the same year is a held seat and skipped.
 * Names and roll numbers are never written.
 *
 * Sources: https://meta-secure.com/MDMS2024/UploadDocs/<file>.pdf (file names from links posted on t.me/SRISAINEETPG and
 * the Internet Archive's index of that folder; all still served by the portal).
 *
 * Usage: tsx pipeline/states/uttarakhand.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/uttarakhand';
// Usage with a year (tsx pipeline/states/uttarakhand.ts 2025) parses only that year's rounds
const U = 'https://meta-secure.com/MDMS2024/UploadDocs/';
// [out, year, round label, files (regular, NRI)]
const ROUNDS: [string, number, string, string[]][] = [
  ['uk2024_r1', 2024, 'Round 1', ['MDMSSeatAllocationrevisedd']], // revised, 2024 first round
  ['uk2024_r2', 2024, 'Round 2', ['MDMSSecondRound']],
  ['uk2024_r3', 2024, 'Round 3', ['SeatAllocationReport3rdRoundRegGen']],
  ['uk2024_stray', 2024, 'Stray', ['NEETMDMSStrayRound']],
  ['uk2024_sstray', 2024, 'Special stray', ['SPECIALSTRAYROUND']],
  ['uk2025_r1', 2025, 'Round 1', ['NEETMDMS20251roundregular', 'NEETMDMS20251roundNRI']],
  ['uk2025_r2', 2025, 'Round 2', ['MDMSSeatAllocation2025_2RERE', 'MDMSSeatAllocation2025_NRI_2']], // revised 21-12-2025
  ['uk2025_r3', 2025, 'Round 3', ['MDMSSeatAllocation2025regular3', 'MDMSSeatAllocation2025_3NRI']],
  ['uk2025_stray', 2025, 'Stray', ['MDMSSeatAllocation2025regularSTRAY', 'MDMSSeatAllocation2025_STRAYNRI']],
  ['uk2026_r1', 2026, 'Round 1', ['PROVISIONALCOMPLETEBROADSHEETNEETMDMS2026FirstRoundRegular']],
];
const only = Number(process.argv[2] ?? 0); // optional: one year (rounds of a year depend on each other, years do not)
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const airs = new Map<number, Record<string, [number, number]>>();
const held = new Map<string, string>(); // `${year}|${roll}` → seat key after the latest round read
const quotas = new Map<string, number>(), cats = new Map<string, number>(), colleges = new Map<string, number>(), courses = new Map<string, number>(), remarks = new Map<string, number>();

/** "GeneralMedicine- GOVERNMENTMEDICAL COLLEGE,HALDWANI-( Recognized-StateQuota)" → [course, college, tag] */
const splitSeat = (s: string): [string, string, string] => {
  const t = clean(s);
  const tagAt = t.search(/-\s*\(\s*(Recogni|Permit|PMHS|Pmhs|NRI|Manag|State|All|Govt|Approv|LOP|Seat)/i);
  const body = tagAt >= 0 ? t.slice(0, tagAt) : t, tag = tagAt >= 0 ? t.slice(tagAt).replace(/^-\s*\(\s*/, '').replace(/\)\s*$/, '') : '';
  // the course ends at the first hyphen (course names have none): "Obst.&Gyane-GOVERNMENT…", "Paediatrics-GautamBuddha…"
  const m = body.match(/^(.*?)-\s*(?=\S)/);
  return m ? [clean(m[1]), clean(body.slice(m[0].length)), clean(tag)] : ['', clean(body), clean(tag)];
};

for (const [out, year, label, files] of ROUNDS) {
  if (only && year !== only) continue;
  if (!airs.has(year) && existsSync(`data/raw/nbems/neetpg${year}_air.json`)) airs.set(year, JSON.parse(readFileSync(`data/raw/nbems/neetpg${year}_air.json`, 'utf8')));
  const air = airs.get(year) ?? {};
  const rows: any[] = [];
  let listed = 0, kept = 0, noRank = 0;
  const after = new Map<string, string>();
  for (const file of files) {
    const nri = /NRI/i.test(file);
    let col: Record<string, number> | null = null, cur: any = null, prevKs: string[] = [];
    const flush = () => {
      if (!cur || !clean(cur.seat)) { cur = null; return; }
      const [course, college, tag] = splitSeat(cur.seat);
      const c = cur; cur = null;
      if (!college) return;
      listed++;
      const sk = `${key(course)}|${key(college)}`, hk = `${year}|${c.roll}`;
      after.set(hk, sk);
      if (held.get(hk) === sk || /retained/i.test(c.rem)) { kept++; return; }
      const rank = Number(c.rank) || air[c.roll]?.[0];
      if (!rank) { noRank++; return; }
      const q = clean(c.quota) || (nri ? 'NRIQuota' : '');
      const inService = /^yes/i.test(c.pmhs) && Number(c.inc.replace(/[^\d.]/g, '') || 0) > 0;
      bump(quotas, q); bump(cats, clean(c.acat)); bump(colleges, college); bump(courses, course); bump(remarks, clean(c.rem).slice(0, 40));
      rows.push({ rank, quota: q, quotaTag: tag, institute: college, course, allottedCategory: clean(c.acat), candidateCategory: clean(c.cat),
        inService, nri: nri || /nri/i.test(q), remarks: '', page: c.page });
    };
    for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
      for (const cells of gridTable(pg).rows) {
        const ks = cells.map(key), above = prevKs;
        prevKs = cells.some((c) => /\d{11}/.test(c ?? '')) ? [] : ks;
        // later rounds have a super-header ("Previous Round Allotment details | 2nd Round Allotment details") over the header
        if (ks.some((k) => /roundallotmentdetails$/.test(k))) { flush(); continue; }
        if (ks.some((k) => /rollno$/.test(k))) {
          flush();
          // later rounds print the previous round's Alloted Category / College / Quota first: the current seat is the last match
          // some files split the header over two lines ("NEET" / "Rollno", "%INCENTIVE" / "MARKS"): a column matches on its own
          // text or on the line above joined to it
          const both = ks.map((k, i) => (above[i] ?? '') + k), hit = (re: RegExp) => (k: string, i: number) => re.test(k) || re.test(both[i]);
          const f = (re: RegExp) => ks.findIndex(hit(re)), fl = (re: RegExp) => ks.findLastIndex(hit(re));
          col = { roll: f(/rollno$/), rank: f(/^neetrank/), pmhs: f(/^pmhs/), cat: f(/^(ukcategory|catgeory|category)$/), inc: f(/incentive/),
            quota: fl(/^allot+edquota/), acat: fl(/^allot+edcategory/), seat: fl(/^allot+edcollege/), rem: f(/^remark/) };
          continue;
        }
        if (!col) continue;
        const get = (i: number) => (i < 0 ? '' : cells[i] ?? '');
        const roll = get(col.roll).replace(/\D/g, '');
        if (/^\d{11}$/.test(roll)) {
          flush();
          cur = { roll, rank: get(col.rank).replace(/\D/g, ''), pmhs: get(col.pmhs), cat: get(col.cat), inc: get(col.inc), quota: get(col.quota),
            acat: get(col.acat), seat: get(col.seat), rem: get(col.rem), page: pg.index + 1 };
        } else if (cur && !clean(get(0))) { // wrapped text of the candidate above
          if (clean(get(col.seat))) cur.seat += ' ' + get(col.seat);
          if (clean(get(col.quota))) cur.quota += ' ' + get(col.quota);
          if (clean(get(col.acat))) cur.acat += ' ' + get(col.acat);
        }
      }
    }
    flush();
  }
  for (const [k, v] of after) held.set(k, v);
  rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: U + files[0] + '.pdf', url: U + files[0] + '.pdf', counselling: 'Uttarakhand', year, round: label, rows }));
  console.log(`${out}: ${rows.length} allotments (${listed} listed, ${kept} kept an earlier seat, ${noRank} without an AIR; ${rows.filter((r) => r.inService).length} in-service, ${rows.filter((r) => r.nri).length} NRI)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('quotas', top(quotas));
console.log('categories', top(cats));
console.log('remarks', top(remarks));
console.log('colleges', top(colleges));
console.log('courses', Object.keys(top(courses)).join(' | '));
