/**
 * Rajasthan NEET PG state counselling (NEET PG Admission/Counselling Board, SMS Medical College) → allotments in the
 * same shape as MCC rounds.
 *
 * The board's allotment lists (rajpgneet2025.in/notifications/<id>.pdf) give the Combined State Merit No., category,
 * course, seat type, college and NEET PG roll number. The round-wise Provisional State Merit Lists give each roll
 * number's NEET Rank (All India Rank), so every allotment gets an AIR. Names are printed in both lists; they are
 * skipped and never written out.
 *
 * rajpgneet2025.in was offline (503) when this was built; the PDFs were retrieved from the Internet Archive's copies
 * of the official URLs, which are kept as the source links.
 *
 * Usage: tsx pipeline/states/rajasthan.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/rajasthan';
const SITE = 'https://rajpgneet2025.in/notifications/';
const ROUNDS: [string, string, string][] = [ // [file, round label, official PDF id]
  ['rj2025_r1', 'Round 1', '1765044823670'],
  ['rj2025_r2', 'Round 2', '1766732402146'],
  ['rj2025_r3', 'Round 3', '1771171673167'],
  ['rj2025_stray', 'Stray', '1772018528162'],
];
const MERIT = ['rj2025_merit_r1b', 'rj2025_merit_r2', 'rj2025_merit_r3', 'rj2025_merit_r3rev', 'rj2025_merit_stray'];
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

async function* tables(file: string) {
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) yield { page: pg.index + 1, rows: gridTable(pg).rows };
}

// ---- roll number → NEET rank (AIR), from the merit lists ----
const air = new Map<string, number>(), inService = new Set<string>();
for (const f of MERIT) {
  let roll = -1, rank = -1, svc = -1, n = 0;
  for await (const { rows } of tables(f)) {
    for (const cells of rows) {
      const ks = cells.map(key);
      const r = ks.findIndex((k) => k.includes('rollnumber')), k2 = ks.findIndex((k) => k === 'neetrank');
      if (r >= 0) { roll = r; rank = k2; svc = ks.findIndex((k) => k.startsWith('inservicenonservice')); continue; }
      if (roll < 0 || rank < 0) continue;
      const rl = (cells[roll] ?? '').replace(/\D/g, ''), rk = (cells[rank] ?? '').replace(/\D/g, '');
      if (/^\d{11}$/.test(rl) && rk) {
        air.set(rl, Number(rk)); n++;
        if (svc >= 0) { if (/^in/i.test((cells[svc] ?? '').replace(/\W/g, ''))) inService.add(rl); else inService.delete(rl); }
      }
    }
  }
  console.log(`${f}: ${n} roll numbers with a NEET rank`);
}
console.log(`roll → AIR: ${air.size} (${inService.size} in-service, who get bonus marks on the state merit list)`);

// ---- allotment lists ----
const statuses = new Map<string, number>(), cats = new Map<string, number>(), seats = new Map<string, number>();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const held = new Map<string, string>(); // roll → seat held after the previous round (Round 2 re-lists everyone)
for (const [file, label, id] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, noAir = 0, skipped = 0, same = 0;
  const nowHeld = new Map<string, string>();
  for await (const { page, rows } of tables(file)) {
    for (const cells of rows) {
      const ks = cells.map(key);
      if (ks.some((k) => k.includes('meritno'))) {
        const find = (...names: string[]) => ks.findIndex((k) => names.some((n) => k === n || k.startsWith(n)));
        col = {
          cat: find('allottedcategory', 'allotedcategory', 'consideredcategory'), ccat: find('provisionalconsideredcategory'), course: find('allottedcourse'), seat: find('allottedseat', 'allottesseat'),
          college: find('allottedcollege'), roll: find('neetpgroll'), status: find('status'),
        };
        // the considered category of the stray list sits after "Provisional Considered Category"
        if (col.cat < 0) col.cat = ks.findIndex((k) => k.includes('category'));
        continue;
      }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const get = (i: number) => (i < 0 ? '' : (cells[i] ?? '').replace(/\s+/g, ' ').trim());
      const status = get(col.status);
      bump(statuses, status);
      // later rounds list everyone holding a seat; keep only seats allotted in this round
      if (/^(joined|retained|not ?upgraded|cancel)/i.test(status)) { skipped++; continue; }
      const roll = get(col.roll).replace(/\D/g, '');
      const rank = air.get(roll);
      if (!rank) { noAir++; continue; }
      // some lists split "MD" | "Radiodiagnosis" over two cells, the first under an empty header
      const prev = col.course > 0 && ks[col.course - 1] === '' ? get(col.course - 1) : '';
      const course = `${prev} ${get(col.course)}`.trim();
      const seatKey = `${get(col.college)}|${course.replace(/^(MD|MS)\b\s*/i, '')}|${get(col.seat)}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
      nowHeld.set(roll, seatKey);
      if (held.get(roll) === seatKey) { same++; continue; }
      bump(cats, get(col.cat)); bump(seats, get(col.seat));
      out.push({
        rank, quota: get(col.seat), inService: inService.has(roll), institute: get(col.college), course, allottedCategory: get(col.cat), candidateCategory: get(col.ccat >= 0 ? col.ccat : col.cat),
        remarks: status, page,
      });
    }
  }
  for (const [r, k] of nowHeld) held.set(r, k);
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: SITE + id + '.pdf', url: SITE + id + '.pdf', counselling: 'Rajasthan', year: 2025, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments, ${skipped + same} kept an earlier seat, ${noAir} without an AIR`);
}
console.log('status', Object.fromEntries(statuses));
console.log('categories', Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])));
console.log('seat types', Object.fromEntries([...seats].sort((a, b) => b[1] - a[1])));
