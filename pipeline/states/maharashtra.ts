/**
 * Maharashtra NEET PG state counselling (State CET Cell) → allotments in the same shape as MCC rounds.
 *
 * The CET Cell publishes, per round, a fixed-width text "Provisional Selection List":
 *   SrNo  SML  FormNo  Name  Cat.  Code : Subject  College  Quota (note)
 * where SML is the State Merit List number, not the All India Rank. The Common State Merit List maps each
 * FormNo to its NEET PG All India Rank, so every allotment gets an AIR and joins the MCC data.
 * Candidate names are read only to skip past them; they are never written out.
 *
 * Usage: tsx pipeline/states/maharashtra.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { pageLines, type Line } from '../textlines';

const RAW = 'data/raw/state';
type YearCfg = { year: number; base: string; rounds: [string, string, string][]; merits: string[]; meritRe: RegExp; form: string };
const YEARS: YearCfg[] = [
  // 2026 (medical2026.mahacet.org NEET-PGM-2026): Round 1 provisional selection list printed 05-11-2026; AIR from the final
  // provisional state merit list (02-11-2026) and the in-service merit list. Same row layout as 2024.
  { year: 2026, base: 'https://medical2026.mahacet.org/NEET-PGM-2026/instructions-downloadFile/', form: '261',
    rounds: [['mh2026_r1', 'Round 1', 'PGM_SelList_R1.pdf']],
    merits: ['mh2026_merit_r1', 'mh2026_merit_r1_ins'], meritRe: /^\d+\s+(\d+)\s+[\d.]+\s+\d{11}\b.*?\b(261\d{6})\b/ },
  { year: 2025, base: 'https://statecetcell.s3.ap-south-1.amazonaws.com/PGM-25/', form: '258',
    rounds: [ // [file, round label, official PDF]
      ['mh2025_r1', 'Round 1', 'SelList_R1.pdf'],
      ['mh2025_r2', 'Round 2', 'SelList_R2.pdf'],
      ['mh2025_r3', 'Round 3', 'Revised_SelList_R3.pdf'],
      ['mh2025_stray', 'Stray', 'SelList_stray.pdf'],
      ['mh2025_stray2', 'Special stray', 'SelList_SVR2.pdf'],
    ],
    // Common Provisional State Merit List (round 1, then CAP round 3 which covers all rounds; the later list wins)
    merits: ['mh2025_merit_r1', 'mh2025_merit'], meritRe: /^\d+\s+[\d.]+\s+(\d+)\s+-?\d+\s+\d{11}\b.*?\b(258\d{6})\b/ },
  // 2024 (medical2024.mahacet.org NEET-PGM-2024): the Round 3 list was overwritten on the portal by the special stray list of the
  // same name, and only the Round 1 common merit list is still online, so candidates who registered later have no AIR.
  { year: 2024, base: 'https://medical2024.mahacet.org/NEET-PGM-2024/instructions-downloadFile/', form: '247',
    rounds: [
      ['mh2024_r1', 'Round 1', 'Revisedpgmr1SelList.pdf'],
      ['mh2024_r2', 'Round 2', 'SelList-R2.pdf'],
      ['mh2024_stray', 'Stray', 'PGM-SelList-R4.pdf'],
      ['mh2024_sstray', 'Special stray', 'SelList.pdf'],
      ['mh2024_sstray2', 'Special stray 2', 'SelList%20splstray%28R2%29.pdf'],
    ],
    merits: ['mh2024_merit_r1'], meritRe: /^\d+\s+(\d+)\s+[\d.]+\s+\d{11}\b.*?\b(247\d{6})\b/ },
];

async function lines(file: string) {
  const out: { page: number; line: Line }[] = [];
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) for (const line of pageLines(pg)) out.push({ page: pg.index + 1, line });
  return out;
}
const textOf = (l: Line) => l.words.map((w) => w.text).join(' ');

// ---- merit list: FormNo → AIR ----
type Cols = { cat: number; code: number; college: number; quota: number };
for (const Y of YEARS) {
const air = new Map<string, number>();
for (const f of Y.merits) { // the later list wins where both have a candidate
  for (const { line } of await lines(f)) {
    const m = textOf(line).match(Y.meritRe);
    if (m) air.set(m[2], Number(m[1]));
  }
}
console.log(`${Y.year} merit list: ${air.size} candidates with an All India Rank`);

// ---- selection lists ----
for (const [file, label, pdf] of Y.rounds) {
  const rows: any[] = [];
  let cols: Cols | null = null, noSeat = 0, noAir = 0;
  for (const { page, line } of await lines(file)) {
    const t = textOf(line);
    if (/^SrNo\s+SML\s+FormNo/.test(t)) {
      const x = (name: string) => line.words.find((w) => w.text.startsWith(name))!.x0;
      cols = { cat: x('Cat'), code: x('Code'), college: x('College'), quota: x('Quota') };
      continue;
    }
    const m = t.match(new RegExp(`^\\d+\\s+[\\d.]+\\s+(${Y.form}\\d{6})\\b`));
    if (!m || !cols) continue;
    if (/Choice Not Available|Disqualified|Not Eligible/i.test(t)) { noSeat++; continue; }
    const tol = 6, c = cols;
    const at = (lo: number, hi: number) => line.words.filter((w) => w.x0 >= lo - tol && w.x0 < hi - tol).map((w) => w.text).join(' ');
    const cat = at(c.cat, c.code).trim();
    const codeSubject = at(c.code, c.college);
    const cm = codeSubject.match(/^(\d{4}[A-Z])\s*:\s*(.+)$/);
    if (!cm) { noSeat++; continue; }
    const college = at(c.college, c.quota).trim();
    const quotaText = line.words.filter((w) => w.x0 >= c.quota - tol).map((w) => w.text).join(' ');
    const qm = quotaText.match(/^(\S+)\s*(?:\((.*)\))?/);
    const rank = air.get(m[1]);
    if (rank == null) { noAir++; continue; } // in-service / not on the common merit list
    rows.push({
      rank, quota: 'Maharashtra State Quota', institute: college, course: cm[2].trim(), courseCode: cm[1],
      allottedCategory: qm?.[1] ?? '', candidateCategory: cat || 'OPEN', remarks: qm?.[2] ?? '', page,
    });
  }
  rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: pdf, url: Y.base + pdf, counselling: 'Maharashtra', year: Y.year, round: label, extractedAt: new Date().toISOString(), rows }));
  console.log(`${file}: allotments=${rows.length} noSeat=${noSeat} withoutAIR=${noAir}`);
}
}
