/**
 * Gujarat earlier seasons (ACPPGMEC "Compiled Closure" PDFs, medadmgujarat.ncode.in/WEB/PG<year>/Compiled_Closure_PG_<yy>.pdf)
 * → closing ranks in the same shape as MCC rounds (kind "closing ranks", like Andhra Pradesh).
 *
 * "Institutewise Last Rank of PG-<year>": Branch | Inst.Label ("AMED - GQ") | Inst.Name | then per category
 *   OPEN: Neet Score, Neet Rank, Gen. Merit No | SC / ST / SEBC / EWS: Neet Score, Neet Rank, Gen. Merit No, Cat. Merit No
 * Each rank is the last (closing) All India Rank for that branch × college × quota × category after all rounds.
 * 99999 = seat converted to another category (skipped). Quotas: GQ government, UQ university, IQ in-service, MQ management, NQ NRI.
 *
 * Usage: tsx pipeline/states/gujarat_closure.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/gujarat';
const W = 'http://medadmgujarat.ncode.in/WEB/';
const FILES: [string, number, string][] = [ // [out, year, official path]
  ['gj2024_final', 2024, 'PG2024/Compiled_Closure_PG_2024-25.pdf'],
  ['gj2023_final', 2023, 'PG2023/Compiled_Closure_PG_2023-24.pdf'],
];
const RAWNAME: Record<string, string> = { gj2024_final: 'gj2024_closure', gj2023_final: 'gj2023_closure' };
const CATS: [string, number][] = [['OP', 4], ['SC', 7], ['ST', 11], ['SE', 15], ['EW', 19]]; // category code → rank column

for (const [out, year, path] of FILES) {
  const rows: any[] = [];
  let skipped = 0;
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${RAWNAME[out]}.pdf`)))) {
    for (const c of gridTable(pg).rows) {
      const m = (c[1] ?? '').match(/^([A-Za-z]+)\s*-\s*([A-Z]Q)$/);
      if (!m || c.length < 20) continue;
      for (const [cat, i] of CATS) {
        const rank = Number((c[i] ?? '').replace(/\D/g, ''));
        if (!rank) continue;
        if (rank >= 99999) { skipped++; continue; }
        rows.push({ rank, quota: m[2], collegeCode: m[1], institute: c[2].trim(), course: c[0].replace(/\s+/g, ' ').trim(),
          allottedCategory: cat, candidateCategory: cat, remarks: 'closing rank', page: pg.index + 1 });
      }
    }
  }
  rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: W + path, url: W + path, counselling: 'Gujarat', kind: 'closing ranks', year, round: 'Final (all rounds)', rows }));
  console.log(`${out}: ${rows.length} closing ranks (${skipped} converted seats skipped), ${new Set(rows.map((r) => r.collegeCode)).size} colleges`);
}
