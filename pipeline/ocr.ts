/**
 * OCR a PDF with the NamahaPDF engine (read-only use): each page is rendered with NamahaPDF's PageRenderer and read
 * with its PaddleOCR provider (src/engine/vision/paddleOcrProvider.ts). For PDFs whose fonts carry no text mapping
 * (West Bengal's WBMCC lists), where text extraction only yields glyph numbers.
 *
 * Results are cached per page as JSON words { text, confidence, x, y, width, height } in page pixels at SCALE,
 * at <out dir>/<pdf name>_p<page>.json, so a rerun only OCRs missing pages.
 *
 * Usage: tsx pipeline/ocr.ts <pdf> <out dir> [fromPage] [toPage]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { PDFParser, loadPageContentStream, parseContentStream } from '../../../NamahaPDF/NamahaPDF/src/engine/parser';
import { PageRenderer } from '../../../NamahaPDF/NamahaPDF/src/engine/renderer';
import { PageTreeTraversal } from '../../../NamahaPDF/NamahaPDF/src/engine/editor/PageTreeTraversal';
import { normalizeRotation } from '../../../NamahaPDF/NamahaPDF/src/engine/renderer/pageRotation';
import { installNodeCanvas, createServerCanvas } from '../../../NamahaPDF/NamahaPDF/src/engine/pdf/nodeCanvas';
import { paddleOcrProvider } from '../../../NamahaPDF/NamahaPDF/src/engine/vision/paddleOcrProvider';

export const SCALE = 3;

export async function ocrPdf(pdf: string, outDir: string, from = 1, to = Infinity) {
  await installNodeCanvas();
  mkdirSync(outDir, { recursive: true });
  const parser = new PDFParser(new Uint8Array(readFileSync(pdf)));
  const doc = parser.parse();
  const loader = (ref: any) => parser.loadObject(ref);
  const { pages } = PageTreeTraversal.getAllPages(doc, { objectLoader: loader });
  const ocr = paddleOcrProvider();
  const name = basename(pdf, '.pdf');
  for (let i = from - 1; i < Math.min(pages.length, to); i++) {
    const out = `${outDir}/${name}_p${i + 1}.json`;
    if (existsSync(out)) continue;
    const p = pages[i];
    const mb = p.mediaBox ?? [0, 0, 612, 792];
    const w = Math.ceil(mb[2] - mb[0]), h = Math.ceil(mb[3] - mb[1]);
    const rot = normalizeRotation(p.rotate), swap = rot === 90 || rot === 270;
    const canvas: any = await createServerCanvas((swap ? h : w) * SCALE, (swap ? w : h) * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const loaded = await loadPageContentStream(p.dict.entries.get('Contents'), loader);
    const renderer = new PageRenderer(canvas, w, h, SCALE, { rotation: rot });
    renderer.setFontContext(p.resources, loader);
    try { await renderer.renderAsync(parseContentStream(loaded.combinedBytes)); } catch (e) { console.warn(`page ${i + 1}: render error`, (e as Error).message); }
    const png: Buffer = await canvas.encode('png');
    const res = await ocr.ocr!(new Uint8Array(png));
    writeFileSync(out, JSON.stringify({ page: i + 1, width: canvas.width, height: canvas.height, words: res.words }));
    console.log(`${name} p${i + 1}/${pages.length}: ${res.words.length} words`);
  }
  return pages.length;
}

if (process.argv[1]?.endsWith('ocr.ts')) {
  const [pdf, out, from, to] = process.argv.slice(2);
  await ocrPdf(pdf, out, Number(from ?? 1), Number(to ?? Infinity));
}
