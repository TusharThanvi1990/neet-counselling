/**
 * Borderless (text) tables → words with positions. Groups the engine's runs into visual lines by baseline,
 * then into words by horizontal gap. Used for state lists that print fixed-width text instead of ruled tables.
 */
import type { PageData, Run } from './engine';

export type Word = { text: string; x0: number; x1: number; base: number };
export type Line = { base: number; words: Word[] };

export function pageLines(pg: PageData, baseTol = 2.5): Line[] {
  const rows: Run[][] = [];
  for (const r of [...pg.runs].sort((a, b) => a.base - b.base || a.x - b.x)) {
    const row = rows.find((l) => Math.abs(l[0].base - r.base) < baseTol);
    row ? row.push(r) : rows.push([r]);
  }
  return rows.map((rs) => {
    rs.sort((a, b) => a.x - b.x);
    const words: Word[] = [];
    for (const r of rs) {
      const text = r.text;
      const last = words[words.length - 1];
      const gap = last ? r.x - last.x1 : Infinity;
      const em = Math.max(1.5, (r.h || 8) * 0.25);
      if (last && gap <= em && !/^\s/.test(text) && !/\s$/.test(last.text)) { last.text += text; last.x1 = r.x + r.w; }
      else {
        // A run can hold a whole line; place each word by its character offset (fixed-width text), walking
        // forward so a repeated word ("OBC … OBC") gets its own position, not the first occurrence's.
        let offset = 0;
        const perChar = r.w / Math.max(1, text.length);
        for (const part of text.split(/(\s+)/)) {
          if (part.trim()) words.push({ text: part, x0: r.x + offset * perChar, x1: r.x + (offset + part.length) * perChar, base: r.base });
          offset += part.length;
        }
      }
    }
    return { base: rs[0].base, words: words.map((w) => ({ ...w, text: w.text.trim() })).filter((w) => w.text) };
  }).sort((a, b) => a.base - b.base);
}
