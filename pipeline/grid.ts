// Generic ruled-table → cell text, from engine runs + rules. Handles per-glyph runs by gap-joining.
import type { PageData, Run } from './engine';

export const uniq = (xs: number[], eps = 2) => xs.sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > eps);

/** Join runs inside one cell into text: group by baseline into lines, then glue by horizontal gap. */
export function cellText(runs: Run[]): string {
  const lines: Run[][] = [];
  for (const r of [...runs].sort((a, b) => a.base - b.base || a.x - b.x)) {
    const ln = lines.find((l) => Math.abs(l[0].base - r.base) < 2.5);
    ln ? ln.push(r) : lines.push([r]);
  }
  return lines.map((l) => {
    l.sort((a, b) => a.x - b.x);
    let s = '';
    l.forEach((r, i) => {
      const prev = l[i - 1];
      const gap = prev ? r.x - (prev.x + prev.w) : 0;
      const em = Math.max(2, (r.h || 8) * 0.18);
      s += (prev && gap > em && !s.endsWith(' ') && !r.text.startsWith(' ') ? ' ' : '') + r.text;
    });
    return s;
  }).join(' ').replace(/\s+/g, ' ').trim();
}

/** Split a ruled page into rows of cells. Columns = full-height vertical rules; rows = horizontal rules. */
export function gridRows(pg: PageData, minColH = 5): string[][] {
  return gridTable(pg, minColH).rows;
}

/** Same as gridRows, plus the column boundaries (x) so callers can match columns across pages by position. */
export function gridTable(pg: PageData, minColH = 5): { cols: number[]; rows: string[][] } {
  // eps 8: some header pages carry hairline spacer columns the data pages do not.
  const cols = uniq(pg.v.filter((s) => Math.abs(s.y1 - s.y0) > minColH).map((s) => s.x0), 8);
  const lines = uniq(pg.h.filter((s) => Math.abs(s.x1 - s.x0) > 5).map((s) => s.y0));
  const rows: string[][] = [];
  for (let r = 0; r + 1 < lines.length; r++) {
    const [top, bot] = [lines[r], lines[r + 1]];
    const inRow = pg.runs.filter((t) => t.base > top && t.base <= bot + 1);
    if (!inRow.length) continue;
    rows.push(cols.slice(0, -1).map((c0, c) => cellText(inRow.filter((t) => { const cx = t.x + t.w / 2; return cx >= c0 && cx < cols[c + 1]; }))));
  }
  return { cols, rows };
}
