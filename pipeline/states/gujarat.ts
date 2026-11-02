/**
 * Gujarat NEET PG state counselling (ACPPGMEC, medadmgujarat.org) → allotments in the same shape as MCC rounds.
 *
 * ACPPGMEC publishes per round a "Provisional Meritwise Allotment List" (fixed-width text):
 *   SR  [F]  STUDENT NAME  MERITNO  Cat  Merit  Score  ADM Cat  Adm Seat Type  AIQ Rank  Adm Type  Adm Round  College  Branch
 * "AIQ Rank" is the NEET PG All India Rank. Later rounds re-list everyone holding a seat; only rows whose Adm Round is
 * the current round are kept. College is a short code (AMED, SMED, …); the "Institute Wise" list for the last round
 * gives full names, joined on AIR. Names are skipped and never written.
 *
 * Usage: tsx pipeline/states/gujarat.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { pageLines, type Word } from '../textlines';

const RAW = 'data/raw/states/gujarat';
const WEB = 'http://medadmgujarat.ncode.in/web/';
const ROUNDS: [string, number, string, number, string][] = [ // [file, year, label, round no., official path]
  ['gj2025_r1', 2025, 'Round 1', 1, 'PG2025/MDMS/R1/r1_merit_wiseadm_xyz1.pdf'],
  ['gj2025_r2', 2025, 'Round 2', 2, 'PG2025/MDMS/R2/r2_merit_wiseadm_22122025.pdf'],
  ['gj2025_r3', 2025, 'Round 3', 3, 'PG2025/MDMS/R3/r3_merit_wiseadm1.pdf'],
  ['gj2025_stray', 2025, 'Stray', 4, 'PG2025/MDMS/R4/r4_merit_wiseadm.pdf'],
  ['gj2026_r1', 2026, 'Round 1', 1, 'PG2026/MDMS/R1/r1_merit_wiseadm_0426.pdf'],
];
const RANK = /^\d+\.\d$/;

type Row = { page: number; rank: number; cat: string; admCat: string; seat: string; type: string; round: number; college: string; branch: string };
async function readList(file: string): Promise<Row[]> {
  const out: Row[] = [];
  let col: Record<string, number> | null = null;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
    for (const line of pageLines(pg)) {
      const w = line.words, t = w.map((x) => x.text).join(' ');
      if (/MERITNO/.test(t) && /College/.test(t)) {
        const x = (s: string, nth = 0) => w.filter((v) => v.text === s)[nth]?.x0 ?? -1;
        col = { cat: x('Cat'), admCat: x('ADM'), seat: x('Adm', 0), aiq: x('AIQ'), type: x('Adm', 1), round: x('Adm', 2), college: x('College'), branch: x('Branch') };
        continue;
      }
      if (!col || !/^\d+F?$/.test(w[0]?.text ?? '')) continue;
      const rk = w.find((v) => RANK.test(v.text) && Math.abs(v.x0 - col!.aiq) < 25);
      if (!rk) continue;
      const near = (x: number, tol = 14) => w.find((v) => Math.abs(v.x0 - x) <= tol && v !== rk)?.text ?? '';
      const right = (from: number, to: number) => w.filter((v: Word) => v.x0 >= from && v.x0 < to).map((v) => v.text);
      // the college code and the branch can run together ("GCSMEDDermatology", "JamkhambhaliyaDiploma …")
      const tail = right(col.college - 10, 9999).join(' ');
      const cm = tail.match(/^([A-Z]{2,}(?=[A-Z][a-z])|[A-Z]{2,}(?=\s)|[A-Z][a-z]+(?=[A-Z])|\S+)\s*(.*)$/);
      out.push({
        page: pg.index + 1, rank: Math.round(Number(rk.text)), cat: near(col.cat), admCat: near(col.admCat), seat: near(col.seat, 16),
        type: right(rk.x1 + 2, col.round - 5).join(' '), round: Number(near(col.round, 14)) || 0,
        college: cm?.[1] ?? '', branch: (cm?.[2] ?? '').trim(),
      });
    }
  }
  return out;
}

// ---- college code → full name: the Institute Wise list groups rows under "001 AMED B. J. Medical college, Ahmedabad" ----
const names = new Map<string, string>();
for (const f of ['gj2025_inst_r3', 'gj2026_inst_r1']) {
  try {
    for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${f}.pdf`)))) {
      for (const line of pageLines(pg)) {
        const m = line.words.map((x) => x.text).join(' ').match(/^\d{3}\s+([A-Za-z]+)\s+(.+)$/);
        if (m && !names.has(m[1])) names.set(m[1], m[2].replace(/\s+/g, ' ').replace(/,(?=\S)/g, ', ').trim());
      }
    }
  } catch { /* optional file */ }
}
const nameOf = (code: string) => names.get(code) ?? '';
console.log(`college codes with a full name: ${names.size}`);

const seats = new Map<string, number>(), types = new Map<string, number>(), cats = new Map<string, number>(), noName = new Set<string>();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
for (const [file, year, label, no, path] of ROUNDS) {
  const all = await readList(file);
  const rows = all.filter((r) => r.round === no).map((r) => {
    bump(seats, r.seat); bump(types, r.type.replace(/-[\d.]+$/, '')); bump(cats, r.admCat);
    if (!nameOf(r.college)) noName.add(r.college);
    return { rank: r.rank, quota: r.seat, admType: r.type, collegeCode: r.college, institute: nameOf(r.college) || r.college, course: r.branch,
      allottedCategory: r.admCat, candidateCategory: r.cat, remarks: '', page: r.page };
  }).sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: WEB + path, url: WEB + path, counselling: 'Gujarat', year, round: label, rows }));
  console.log(`${file}: ${rows.length} allotments in this round (of ${all.length} listed)`);
}
console.log('seat types', Object.fromEntries(seats));
console.log('adm types', Object.fromEntries(types));
console.log('adm categories', Object.fromEntries(cats));
console.log('codes without a name', [...noName]);
console.log('code names', Object.fromEntries([...names.keys()].sort().map((c) => [c, nameOf(c)])));
