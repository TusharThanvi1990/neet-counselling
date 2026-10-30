// Thin read-only bridge to the NamahaPDF engine: positioned text runs + ruling lines per page.
import { PDFParser, loadPageContentStream, parseContentStream } from '../../../NamahaPDF/NamahaPDF/src/engine/parser';
import { PageRenderer } from '../../../NamahaPDF/NamahaPDF/src/engine/renderer';
import { PageTreeTraversal } from '../../../NamahaPDF/NamahaPDF/src/engine/editor/PageTreeTraversal';
import { collectRuleSegments } from '../../../NamahaPDF/NamahaPDF/src/engine/pdf/ruleSegments';
import { normalizeRotation, pageToDisplayMatrix } from '../../../NamahaPDF/NamahaPDF/src/engine/renderer/pageRotation';
import { installNodeCanvas, createServerCanvas } from '../../../NamahaPDF/NamahaPDF/src/engine/pdf/nodeCanvas';

export interface Run { text: string; x: number; y: number; w: number; h: number; base: number; }
export interface PageData { index: number; width: number; height: number; runs: Run[]; h: { x0: number; y0: number; x1: number; y1: number }[]; v: { x0: number; y0: number; x1: number; y1: number }[]; }

export async function* readPages(bytes: Uint8Array, opts: { from?: number; to?: number } = {}): AsyncGenerator<PageData> {
  await installNodeCanvas();
  const parser = new PDFParser(bytes);
  const doc = parser.parse();
  const loader = (ref: any) => parser.loadObject(ref);
  const { pages } = PageTreeTraversal.getAllPages(doc, { objectLoader: loader });
  const to = Math.min(pages.length, opts.to ?? pages.length);
  for (let i = opts.from ?? 0; i < to; i++) {
    const p = pages[i];
    const mb = p.mediaBox ?? [0, 0, 612, 792];
    const w = Math.ceil(mb[2] - mb[0]), hgt = Math.ceil(mb[3] - mb[1]);
    const loaded = await loadPageContentStream(p.dict.entries.get('Contents'), loader);
    const commands = parseContentStream(loaded.combinedBytes);
    // Display space: apply the page's /Rotate so sideways-authored tables come out upright.
    const rot = normalizeRotation(p.rotate);
    const swap = rot === 90 || rot === 270;
    const dw = swap ? hgt : w, dh = swap ? w : hgt;
    const canvas = await createServerCanvas(dw, dh);
    const renderer = new PageRenderer(canvas as any, w, hgt, 1, { disableClip: true, rotation: rot });
    renderer.setFontContext(p.resources, loader);
    try { await renderer.renderAsync(commands); } catch { /* keep captured */ }
    const runs = (renderer.getCapturedTextRuns() as any[]).filter((r) => r.text && r.text.trim()).map((r) => ({
      text: r.text, x: r.canvasX, y: r.canvasY, w: r.canvasWidth, h: r.canvasHeight, base: r.canvasBaselineY ?? r.canvasY + r.canvasHeight,
    }));
    const rules = await collectRuleSegments(commands, dh, 1, p.resources, loader, pageToDisplayMatrix(rot, w, hgt) as any);
    yield { index: i, width: dw, height: dh, runs, h: rules.h, v: rules.v };
  }
}
