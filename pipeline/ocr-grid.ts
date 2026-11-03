/**
 * Table OCR with the NamahaPDF engine (read-only use) for PDFs whose fonts have no text mapping.
 * The ruling lines are read from the PDF itself (exact cell boxes); each column strip of the rendered page is OCR'd
 * separately with NamahaPDF's PaddleOCR provider, and every OCR line is put into the cell whose row band holds its
 * centre. This keeps neighbouring columns from merging and joins wrapped cell text.
 *
 * Output per page (cached, so reruns only OCR missing pages): <out dir>/<pdf name>_grid_p<page>.json
 *   { page, rows: string[][] }   (rows top to bottom, one string per column)
 *
 * Usage: tsx pipeline/ocr-grid.ts <pdf> <out dir> [fromPage] [toPage]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { PDFParser, loadPageContentStream, parseContentStream } from '../../../NamahaPDF/NamahaPDF/src/engine/parser';
import { PageRenderer } from '../../../NamahaPDF/NamahaPDF/src/engine/renderer';
import { PageTreeTraversal } from '../../../NamahaPDF/NamahaPDF/src/engine/editor/PageTreeTraversal';
import { normalizeRotation, pageToDisplayMatrix } from '../../../NamahaPDF/NamahaPDF/src/engine/renderer/pageRotation';
import { collectRuleSegments } from '../../../NamahaPDF/NamahaPDF/src/engine/pdf/ruleSegments';
import { installNodeCanvas, createServerCanvas } from '../../../NamahaPDF/NamahaPDF/src/engine/pdf/nodeCanvas';
import { paddleOcrProvider } from '../../../NamahaPDF/NamahaPDF/src/engine/vision/paddleOcrProvider';
import { uniq } from './grid';

const SCALE = 3, PAD = 2;

export async function ocrGrid(pdf: string, outDir: string, from = 1, to = Infinity) {
  await installNodeCanvas();
  mkdirSync(outDir, { recursive: true });
  const parser = new PDFParser(new Uint8Array(readFileSync(pdf)));
  const doc = parser.parse();
  const loader = (ref: any) => parser.loadObject(ref);
  const { pages } = PageTreeTraversal.getAllPages(doc, { objectLoader: loader });
  const ocr = paddleOcrProvider();
  const name = basename(pdf, '.pdf');
  for (let i = from - 1; i < Math.min(pages.length, to); i++) {
    const out = `${outDir}/${name}_grid_p${i + 1}.json`;
    if (existsSync(out)) continue;
    const p = pages[i];
    const mb = p.mediaBox ?? [0, 0, 612, 792];
    const w = Math.ceil(mb[2] - mb[0]), h = Math.ceil(mb[3] - mb[1]);
    const rot = normalizeRotation(p.rotate), swap = rot === 90 || rot === 270;
    const dw = swap ? h : w, dh = swap ? w : h;
    const commands = parseContentStream((await loadPageContentStream(p.dict.entries.get('Contents'), loader)).combinedBytes);
    const rules = await collectRuleSegments(commands, dh, 1, p.resources, loader, pageToDisplayMatrix(rot, w, h) as any);
    const xs = uniq(rules.v.filter((l: any) => Math.abs(l.y1 - l.y0) > 5).map((l: any) => l.x0));
    const ys = uniq(rules.h.filter((l: any) => Math.abs(l.x1 - l.x0) > 20).map((l: any) => l.y0));
    const rows: string[][] = [];
    if (xs.length >= 2 && ys.length >= 2) {
      const canvas: any = await createServerCanvas(dw * SCALE, dh * SCALE);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const renderer = new PageRenderer(canvas, w, h, SCALE, { rotation: rot });
      renderer.setFontContext(p.resources, loader);
      try { await renderer.renderAsync(commands); } catch (e) { console.warn(`page ${i + 1}: render error`, (e as Error).message); }
      // the last row's text can run past the bottom rule, so read a little below it and give the overflow to that row
      const top = ys[0], bottom = Math.min(dh, ys[ys.length - 1] + 14);
      for (let r = 0; r < ys.length - 1; r++) rows.push(Array(xs.length - 1).fill(''));
      for (let c = 0; c < xs.length - 1; c++) {
        const x0 = (xs[c] + 0.6) * SCALE, cw = (xs[c + 1] - xs[c] - 1.2) * SCALE, y0 = top * SCALE, chh = (bottom - top) * SCALE;
        const strip: any = await createServerCanvas(Math.ceil(cw) + PAD * 2, Math.ceil(chh) + PAD * 2);
        const sctx = strip.getContext('2d');
        sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, strip.width, strip.height);
        sctx.drawImage(canvas, x0, y0, cw, chh, PAD, PAD, cw, chh);
        const res = await ocr.ocr!(new Uint8Array(await strip.encode('png')));
        const lines = res.words.map((wd) => ({ text: wd.text, cy: top + (wd.y - PAD + wd.height / 2) / SCALE, x: wd.x }))
          .sort((a, b) => a.cy - b.cy || a.x - b.x);
        for (const ln of lines) {
          let r = ys.findIndex((y, k) => k < ys.length - 1 && ln.cy >= y && ln.cy < ys[k + 1]);
          if (r < 0 && ln.cy >= ys[ys.length - 1] && ln.cy < ys[ys.length - 1] + 7) r = ys.length - 2;
          if (r >= 0) rows[r][c] = rows[r][c] ? `${rows[r][c]} ${ln.text}` : ln.text;
        }
      }
    }
    writeFileSync(out, JSON.stringify({ page: i + 1, rows }));
    console.log(`${name} p${i + 1}/${pages.length}: ${rows.length} rows`);
  }
  return pages.length;
}

if (process.argv[1]?.endsWith('ocr-grid.ts')) {
  const [pdf, out, from, to] = process.argv.slice(2);
  await ocrGrid(pdf, out, Number(from ?? 1), Number(to ?? Infinity));
}
