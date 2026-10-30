export type SearchParams = Record<string, string | string[] | undefined>;

/** The current query string with some keys replaced (undefined / '' removes a key). */
export function hrefWith(path: string, sp: SearchParams, changes: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k in changes || v == null) continue;
    for (const one of Array.isArray(v) ? v : [v]) qs.append(k, one);
  }
  for (const [k, v] of Object.entries(changes)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export const fmt = (n: number) => n.toLocaleString('en-IN');
