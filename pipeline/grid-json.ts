/**
 * Write a text-based PDF's ruled tables in the same per-page JSON shape that pipeline/ocr-grid.ts produces
 * ({ page, rows: string[][] } at <out dir>/<name>_grid_p<n>.json), so one parser can read OCR'd and text PDFs alike.
 * Usage: tsx pipeline/grid-json.ts <pdf> <out dir> <name>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readPages } from './engine';
import { gridTable } from './grid';
const [pdf, out, name] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
let n = 0;
for await (const pg of readPages(new Uint8Array(readFileSync(pdf)))) {
  writeFileSync(`${out}/${name}_grid_p${pg.index + 1}.json`, JSON.stringify({ page: pg.index + 1, rows: gridTable(pg).rows }));
  n++;
}
console.log(`${name}: ${n} pages`);
