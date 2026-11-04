/**
 * Jammu & Kashmir NEET PG state counselling (JKBOPEE, jkbopee.gov.in) → allotments in the same shape as MCC rounds.
 *
 * JKBOPEE "Provisional Selection List" notifications carry the list as Annexure A (ruled table):
 *   S No | Roll No | Name | Category | Sub-Cat | [UTL] | [NEET Rank] | UT Rank | Discipline | Institution | CAT-SLI |
 *   [U/A Discipline | U/A Institution | CAT-SLI]
 * Round 1, the physical round and the stray rounds print the NEET (All India) rank; Rounds 2 and 3 do not, so ranks
 * are joined on roll number from the lists that do. In upgrade rounds the first seat is the one held before and the
 * "U/A" (upgraded/allotted) seat is the new one; rows without a U/A seat are skipped. Names and rolls are never written.
 *
 * Usage: tsx pipeline/states/jk.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/jk';
const N = (nid: number) => `https://www.jkbopee.gov.in/Pdf/Downloader.ashx?nid=${nid}&type=n`;
// [file, round label, notice id]; files sharing a label are merged (later file wins per candidate)
const ROUNDS: [string, string, number][] = [
  ['jk2025_r1', 'Round 1', 17308],
  ['jk2025_hmnri', 'Round 1', 17415], // ASCOMS Hindu-minority / NRI seats, counselled separately
  ['jk2025_r2', 'Round 2', 17407],
  ['jk2025_r3a', 'Round 3', 17505],
  ['jk2025_r3b', 'Round 3', 17511],
  ['jk2025_hm', 'Round 3', 17514],
  ['jk2025_phys', 'Mop-up', 17521],
  ['jk2025_stray', 'Stray', 17530],
  ['jk2025_stray2', 'Special stray', 17536],
];
const key = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();

type Row = { roll: string; rank: number; cat: string; sub: string; course: string; inst: string; seat: string; page: number };
async function read(file: string): Promise<Row[]> {
  const out: Row[] = [];
  let col: Record<string, number> | null = null;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('ROLLNO')) {
        const all = (k: string) => ks.flatMap((x, i) => (x === k ? [i] : []));
        const disc = all('DISCIPLINE'), inst = all('INSTITUTION'), sli = all('CATSLI'), ua = ks.indexOf('UADISCIPLINE');
        col = { roll: ks.indexOf('ROLLNO'), rank: ks.indexOf('NEETRANK'), cat: Math.max(ks.indexOf('CATEGORY'), ks.indexOf('CAT')), sub: Math.max(ks.indexOf('SUBCAT'), ks.indexOf('SUBCAT')),
          disc: ua >= 0 ? ua : disc[0], inst: ua >= 0 ? ks.indexOf('UAINSTITUTION') : inst[0], sli: ua >= 0 ? sli[sli.length - 1] : sli[0], hasUA: ua >= 0 ? 1 : 0 };
        continue;
      }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const roll = (cells[col.roll] ?? '').replace(/\D/g, '');
      const course = clean(cells[col.disc]), inst = clean(cells[col.inst]);
      if (!/^\d{11}$/.test(roll) || !course || !inst) continue; // no new seat in this round
      out.push({ roll, rank: col.rank >= 0 ? Number((cells[col.rank] ?? '').replace(/\D/g, '')) : 0, cat: clean(cells[col.cat]), sub: col.sub >= 0 ? clean(cells[col.sub]) : '',
        course, inst, seat: clean(cells[col.sli]), page: pg.index + 1 });
    }
  }
  return out;
}

const parsed = new Map<string, Row[]>();
const air = new Map<string, number>(), daMarks = new Set<string>();
// Provisional Merit List (notice 17250, 28-10-2025): roll → NEET rank, and DA marks (in-service bonus marks)
for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/jk2025_merit.pdf`)))) {
  let col: Record<string, number> | null = null;
  for (const cells of gridTable(pg).rows) {
    const ks = cells.map(key);
    if (ks.includes('ROLLNO') && ks.includes('NEETRANK')) { col = { roll: ks.indexOf('ROLLNO'), rank: ks.indexOf('NEETRANK'), da: ks.indexOf('DAMARKS') }; continue; }
    if (!col) continue;
    const roll = (cells[col.roll] ?? '').replace(/\D/g, ''), rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
    if (!/^\d{11}$/.test(roll) || !rank) continue;
    air.set(roll, rank);
    if (Number(cells[col.da]) > 0) daMarks.add(roll);
  }
}
console.log(`merit list: ${air.size} roll numbers, ${daMarks.size} with in-service (DA) marks`);
for (const [file] of ROUNDS) {
  const rows = await read(file);
  parsed.set(file, rows);
  for (const r of rows) if (r.rank) air.set(r.roll, r.rank);
}
console.log(`roll → NEET rank: ${air.size}`);
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const seats = new Map<string, number>(), insts = new Map<string, number>(), cats = new Map<string, number>();
const byLabel = new Map<string, { files: string[]; ids: number[]; rows: Map<string, Row> }>();
for (const [file, label, nid] of ROUNDS) {
  const g = byLabel.get(label) ?? { files: [], ids: [], rows: new Map() };
  g.files.push(file); g.ids.push(nid);
  // one seat per candidate per round; ASCOMS minority/NRI lists are a separate counselling, so keyed apart
  for (const r of parsed.get(file)!) g.rows.set(/ASCOMS/i.test(r.inst) && file.includes('hm') ? `${r.roll}|hm` : r.roll, r);
  byLabel.set(label, g);
}
for (const [label, g] of byLabel) {
  let noAir = 0;
  const rows = [...g.rows.values()].flatMap((r) => {
    const rank = r.rank || air.get(r.roll);
    if (!rank) { noAir++; return []; }
    bump(seats, r.seat); bump(insts, r.inst); bump(cats, r.cat);
    return [{ rank, quota: r.seat, inService: daMarks.has(r.roll), institute: r.inst, course: r.course, allottedCategory: r.seat, candidateCategory: r.cat, subCategory: r.sub, remarks: '', page: r.page }];
  }).sort((a, b) => a.rank - b.rank);
  const out = `${label === 'Round 1' ? 'jk2025_r1' : label === 'Round 2' ? 'jk2025_r2' : label === 'Round 3' ? 'jk2025_r3' : label === 'Mop-up' ? 'jk2025_mopup' : label === 'Stray' ? 'jk2025_stray' : 'jk2025_stray2'}`;
  const url = N(g.ids[0]);
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: url, url, counselling: 'Jammu & Kashmir', year: 2025, round: label, rows }));
  console.log(`${out}: ${rows.length} allotments from ${g.files.join(', ')} (${noAir} without a NEET rank)`);
}
const top = (m: Map<string, number>) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
console.log('seat categories (CAT-SLI)', top(seats));
console.log('candidate categories', top(cats));
console.log('institutes', top(insts));

// ---- 2026 (Notification 250-BOPEE of 2026, 03-11-2026, nid 19360; merit list Notification 239, nid 19303). Same layout as 2025.
{
  const air26 = new Map<string, number>(), da26 = new Set<string>();
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/jk2026_merit.pdf`)))) {
    let col: Record<string, number> | null = null;
    for (const cells of gridTable(pg).rows) {
      const ks = cells.map(key);
      if (ks.includes('ROLLNO') && ks.includes('NEETRANK')) { col = { roll: ks.indexOf('ROLLNO'), rank: ks.indexOf('NEETRANK'), da: ks.indexOf('DAMARKS') }; continue; }
      if (!col) continue;
      const roll = (cells[col.roll] ?? '').replace(/\D/g, ''), rank = Number((cells[col.rank] ?? '').replace(/\D/g, ''));
      if (!/^\d{11}$/.test(roll) || !rank) continue;
      air26.set(roll, rank);
      if (col.da >= 0 && Number(cells[col.da]) > 0) da26.add(roll);
    }
  }
  console.log(`2026 merit list: ${air26.size} roll numbers, ${da26.size} with in-service (DA) marks`);
  const R26: [string, string, number][] = [['jk2026_r1', 'Round 1', 19360]];
  for (const [file, label, nid] of R26) {
    const seen = new Map<string, Row>();
    for (const r of await read(file)) seen.set(r.roll, r);
    let noAir = 0;
    const rows = [...seen.values()].flatMap((r) => {
      const rank = r.rank || air26.get(r.roll);
      if (!rank) { noAir++; return []; }
      return [{ rank, quota: r.seat, inService: da26.has(r.roll), institute: r.inst, course: r.course, allottedCategory: r.seat, candidateCategory: r.cat, subCategory: r.sub, remarks: '', page: r.page }];
    }).sort((a, b) => a.rank - b.rank);
    const url = N(nid);
    writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: url, url, counselling: 'Jammu & Kashmir', year: 2026, round: label, rows }));
    console.log(`${file}: ${rows.length} allotments (${noAir} without a NEET rank)`);
  }
}

// ---- 2024 (JKBOPEE notifications 177, 194 of 2024 and 008, 015, 017, 030 of 2025; scanned, read with NamahaPDF OCR by
// pipeline/ocr-grid.ts into data/raw/states/jk/ocr). The 2024 lists give the UT merit rank, not the AIR, which comes from
// the NBEMS NEET-PG 2024 result by roll number. Later lists re-list held seats ("Allotted earlier" + "Upgraded/allotted
// now" columns); the last institute code in a row is the seat held after that round, and it counts only when it differs
// from the candidate's seat after the previous round.
{
  const { readdirSync } = await import('node:fs');
  const air24 = JSON.parse(readFileSync('data/raw/nbems/neetpg2024_air.json', 'utf8')) as Record<string, [number, number]>;
  const INST: Record<string, string> = { 'GMC-S': 'GMC-SRINAGAR', 'GMC-J': 'GMC-JAMMU', 'SKIMS-S': 'SKIMS-SRINAGAR', 'ASCOMS-J': 'ASCOMS-JAMMU',
    'GMC-A': 'GMC-ANANTNAG', 'GMC-K': 'GMC-KATHUA', 'GMC-B': 'GMC-BARAMULLA', 'GMC-R': 'GMC-RAJOURI', 'GMC-D': 'GMC-DODA' };
  const R24: [string, string, number][] = [['jk2024_r1', 'Round 1', 16546], ['jk2024_r2', 'Round 2', 16591], ['jk2024_r3', 'Round 3', 16632],
    ['jk2024_mop', 'Mop-up', 16664], ['jk2024_stray', 'Stray', 16667], ['jk2024_sstray', 'Special stray', 16690]];
  const OUT: Record<string, string> = { jk2024_mop: 'jk2024_mopup' };
  const OCR = 'data/raw/states/jk/ocr';
  const held = new Map<string, string>();
  for (const [file, label, nid] of R24) {
    const pages = readdirSync(OCR).filter((f) => f.startsWith(`${file}_grid_p`)).sort((a, b) => Number(a.match(/p(\d+)/)![1]) - Number(b.match(/p(\d+)/)![1]));
    const rows: any[] = [];
    let listed = 0, same = 0, noAir = 0;
    for (const pf of pages) {
      const page = Number(pf.match(/p(\d+)/)![1]);
      for (const raw of JSON.parse(readFileSync(`${OCR}/${pf}`, 'utf8')).rows as string[][]) {
        const c = raw.map((x) => clean(x));
        const ri = c.findIndex((x) => /^\d{11}$/.test(x.replace(/\s/g, '')));
        if (ri < 0) continue;
        const roll = c[ri].replace(/\s/g, '');
        const ii = c.map((x, i) => (INST[x.replace(/\s/g, '')] ? i : -1)).filter((i) => i > ri).pop();
        if (ii == null) continue; // no seat
        listed++;
        // OCR slips in CAT-SLD: "ST-I1"/"ST-11" = ST-II, "ST-|"/"ST-]"/"ST-1" = ST-I; "OM/JKPM", "OM/CDP", "OM/SP" are OM seats of a sub-category
        const fixSeat = (x: string) => x.replace(/^ST-(I1|11|II)$/, 'ST2').replace(/^ST-(\||\]|1|I)$/, 'ST1').replace(/^ALC\/I?B$/, 'ALC').replace(/^OM\/(JKPM|CDP|SP)$/, 'OM');
        const inst = INST[c[ii].replace(/\s/g, '')], course = (c[ii - 1] ?? '').replace(/\s+/g, ''), seat = fixSeat(c[ii + 1] ?? '');
        if (!course) continue;
        const sk = `${inst}|${course}|${seat}`;
        if (held.get(roll) === sk) { same++; continue; }
        held.set(roll, sk);
        const rank = air24[roll]?.[0];
        if (!rank) { noAir++; continue; }
        const cat = c.slice(ri + 2, ri + 4).find((x) => /^[A-Z][A-Z-]{1,6}(\/[A-Z]+)?$/.test(x)) ?? '';
        rows.push({ rank, quota: seat, inService: false, institute: inst, course, allottedCategory: seat, candidateCategory: cat, subCategory: '', remarks: '', page });
      }
    }
    rows.sort((a, b) => a.rank - b.rank);
    const out = OUT[file] ?? file, url = N(nid);
    writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: url, url, counselling: 'Jammu & Kashmir', year: 2024, round: label, rows }));
    console.log(`${out}: ${rows.length} allotments (${listed} listed, ${same} held from the previous round, ${noAir} without an AIR)`);
  }
}
