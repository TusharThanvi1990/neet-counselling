/**
 * Queries behind every page and API route. Each takes plain, already-parsed inputs and returns
 * plain JSON-safe objects, so the same function serves a page render and an /api route.
 */
import { getData, groupsFor, latestFullYear, pdfHref, seatsFor, type Group, type Program, type RoundSet } from './data';

export const CATEGORIES = ['General', 'EWS', 'OBC', 'SC', 'ST'] as const;
export type Category = (typeof CATEGORIES)[number];
export const DEFAULT_QUOTAS = ['all-india', 'dnb-quota', 'self-financed-merit-seat'];

export type Band = 'safe' | 'possible' | 'reach';
export const BAND_LABEL: Record<Band, string> = { safe: 'Safer', possible: 'Possible', reach: 'Reach' };
/** Safer: ≥10% better than closing. Possible: 10% better to 5% worse. Reach: 5–30% worse. */
export const bandOf = (rank: number, close: number): Band | null =>
  rank <= close * 0.9 ? 'safe' : rank <= close * 1.05 ? 'possible' : rank <= close * 1.3 ? 'reach' : null;

/** Seat categories a candidate can take: open seats, their own category, and PwD seats if PwD. */
export function eligibleSeatCats(cat: Category, pwd: boolean): Set<number> {
  const d = getData();
  const names = ['Open'];
  if (cat !== 'General') names.push(cat);
  if (pwd) { names.push('Open PwD'); if (cat !== 'General') names.push(`${cat} PwD`); }
  return new Set(names.map((x) => d.acat.indexOf(x)).filter((x) => x >= 0));
}

/** States with state-counselling data; a state quota's label starts with the state's name. */
export const STATE_NAMES = ['Maharashtra', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Rajasthan', 'Telangana', 'Gujarat', 'Madhya Pradesh', 'Haryana', 'Bihar',
  'Punjab', 'Chhattisgarh', 'Himachal Pradesh', 'Jammu & Kashmir', 'Goa', 'Uttar Pradesh', 'Assam', 'Odisha', 'West Bengal'];
export const STATE_QUOTA = new RegExp(`^(${STATE_NAMES.join('|')}) `);
const BASE_CATS = new Set(['Open', 'EWS', 'OBC', 'SC', 'ST']);

let quotaStateCache: (string | null)[] | null = null;
/** Quota index → state name (null for MCC quotas). */
export function quotaState(qi: number): string | null {
  const d = getData();
  quotaStateCache ??= d.quota.map((q) => q.label.match(STATE_QUOTA)?.[1] ?? null);
  return quotaStateCache[qi];
}

let stateCatCache: { state: string; cat: string }[] | null = null;
/** Each state's own seat categories (beyond Open / EWS / OBC / SC / ST), e.g. Karnataka Cat-2A, Maharashtra NT-C. */
export function stateCategories() {
  if (stateCatCache) return stateCatCache;
  const d = getData(), seen = new Set<string>();
  for (let k = 0; k < d.col.quota.length; k++) {
    const st = quotaState(d.col.quota[k]); if (!st) continue;
    const cat = d.acat[d.col.acat[k]].replace(/ PwD$/, '');
    if (!BASE_CATS.has(cat)) seen.add(`${st}|${cat}`);
  }
  stateCatCache = [...seen].map((s) => { const [state, cat] = s.split('|'); return { state, cat }; })
    .sort((a, b) => a.state.localeCompare(b.state) || a.cat.localeCompare(b.cat));
  return stateCatCache;
}

/** Seat categories per quota: a chosen state category ("Karnataka|Cat-2A") replaces the national one for that state's quotas. */
export function seatCatsFor(p: { cat: Category; pwd: boolean; scat?: string }) {
  const d = getData(), national = eligibleSeatCats(p.cat, p.pwd);
  const [st, sc] = (p.scat ?? '').split('|');
  if (!st || !sc) return (_qi: number) => national;
  const names = ['Open', sc, ...(p.pwd ? ['Open PwD', `${sc} PwD`] : [])];
  const local = new Set(names.map((x) => d.acat.indexOf(x)).filter((x) => x >= 0));
  return (qi: number) => (quotaState(qi) === st ? local : national);
}

// ---- search params ----

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? ''; };
const many = (sp: SP, k: string) => { const v = sp[k]; return v == null ? [] : Array.isArray(v) ? v : [v]; };
const int = (s: string, dflt: number) => { const n = parseInt(s, 10); return Number.isFinite(n) && n > 0 ? n : dflt; };

export type Profile = {
  rank: number; cat: Category; pwd: boolean; year: number; rounds: RoundSet;
  state: string; program: Program; branch: string; quotas: string[];
  /** Optional state category, "State|Category" (e.g. "Karnataka|Cat-2A"), used for that state's quotas. */
  scat: string;
};

export function parseProfile(sp: SP): Profile {
  const d = getData();
  const cat = one(sp, 'cat') as Category;
  const year = int(one(sp, 'year'), latestFullYear(d));
  const rounds = one(sp, 'rounds') as RoundSet;
  const quotas = many(sp, 'quota').filter((q) => d.index.quota.has(q));
  return {
    rank: int(one(sp, 'rank'), 9500),
    cat: CATEGORIES.includes(cat) ? cat : 'General',
    pwd: one(sp, 'pwd') === '1',
    year: d.years.includes(year) ? year : latestFullYear(d),
    rounds: ['r1', 'main', 'all'].includes(rounds) ? rounds : 'main',
    state: d.states.includes(one(sp, 'state')) ? one(sp, 'state') : '',
    program: (['MD/MS', 'DNB', 'Diploma', '6-yr'].includes(one(sp, 'program')) ? one(sp, 'program') : '') as Program,
    branch: d.index.course.has(one(sp, 'branch')) ? one(sp, 'branch') : '',
    // The form always sends `quotas=1` alongside its checkboxes, so "none ticked" stays distinguishable from "first visit".
    quotas: quotas.length || one(sp, 'quotas') === '1' ? quotas : DEFAULT_QUOTAS,
    scat: stateCategories().some((c) => `${c.state}|${c.cat}` === one(sp, 'scat')) ? one(sp, 'scat') : '',
  };
}

// ---- predictor ----

export type Option = {
  key: string; band: Band; instId: string; code: string; institute: string; fullName: string; state: string;
  branchId: string; branch: string; quotaId: string; quota: string; seatCategory: string;
  closingRank: number; openingRank: number; allotted: number; seats: number | null; margin: number;
  closingRound: string; pdf: string;
};

function toOption(g: Group, year: number, rank: number, band: Band): Option {
  const d = getData(), inst = d.inst[g.inst], course = d.course[g.course], quota = d.quota[g.quota];
  const seats = seatsFor(d, year, g);
  return {
    key: choiceKey(year, inst.id, course.id, quota.id), band, instId: inst.id, code: inst.code, institute: inst.name, fullName: inst.full, state: inst.state,
    branchId: course.id, branch: course.label, quotaId: quota.id, quota: quota.label, seatCategory: d.acat[g.acat],
    closingRank: g.close, openingRank: g.open, allotted: g.n, seats, margin: g.close - rank,
    closingRound: d.rounds[g.closeRound].label, pdf: pdfHref(d, g.closeRound, g.closePage),
  };
}

/** Best eligible seat per (institute, branch, quota): the seat category with the most lenient closing rank. */
function bestGroups(p: Profile, year = p.year) {
  const d = getData();
  const cats = seatCatsFor(p);
  const qs = new Set(p.quotas.map((q) => d.index.quota.get(q)!));
  const branch = p.branch ? d.index.course.get(p.branch)! : -1;
  const best = new Map<string, Group>();
  for (const g of groupsFor(year, p.rounds).values()) {
    if (!qs.has(g.quota) || !cats(g.quota).has(g.acat)) continue;
    if (branch >= 0 && g.course !== branch) continue;
    if (p.program && d.course[g.course].program !== p.program) continue;
    if (p.state && d.inst[g.inst].state !== p.state) continue;
    const k = `${g.inst}.${g.course}.${g.quota}`, cur = best.get(k);
    if (!cur || g.close > cur.close) best.set(k, g);
  }
  return best;
}

export type SortKey = 'close' | 'margin' | 'inst';

export function predict(p: Profile, opts: { band?: Band | 'all'; q?: string; sort?: SortKey; limit?: number } = {}) {
  const d = getData();
  const q = (opts.q ?? '').trim().toLowerCase();
  const counts: Record<Band, number> = { safe: 0, possible: 0, reach: 0 };
  const list: { g: Group; band: Band }[] = [];
  for (const g of bestGroups(p).values()) {
    const band = bandOf(p.rank, g.close);
    if (!band) continue;
    if (q && !d.inst[g.inst].full.toLowerCase().includes(q)) continue;
    counts[band]++;
    if (!opts.band || opts.band === 'all' || opts.band === band) list.push({ g, band });
  }
  const sort = opts.sort ?? 'close';
  list.sort(sort === 'margin' ? (a, b) => b.g.close - a.g.close
    : sort === 'inst' ? (a, b) => d.inst[a.g.inst].name.localeCompare(d.inst[b.g.inst].name) : (a, b) => a.g.close - b.g.close);
  const limit = opts.limit ?? 100;
  return {
    counts, total: list.length,
    options: list.slice(0, limit).map(({ g, band }) => toOption(g, p.year, p.rank, band)),
  };
}

// ---- allotment browser ----

export type BrowseFilters = { round: string; q: string; branch: string; quota: string; seat: string; state: string; min: number; max: number; page: number };

export function parseBrowse(sp: SP): BrowseFilters {
  const d = getData();
  const round = d.rounds.some((r) => r.id === one(sp, 'round')) ? one(sp, 'round') : d.rounds[d.rounds.length - 1].id;
  return {
    round, q: one(sp, 'q'), branch: one(sp, 'branch'), quota: one(sp, 'quota'), seat: one(sp, 'seat'), state: one(sp, 'state'),
    min: int(one(sp, 'min'), 0), max: int(one(sp, 'max'), 0), page: int(one(sp, 'page'), 1),
  };
}

export const PAGE_SIZE = 50;

export function browse(f: BrowseFilters) {
  const d = getData(), { col } = d;
  const rd = d.rounds.findIndex((r) => r.id === f.round);
  const branch = f.branch ? d.index.course.get(f.branch) ?? -2 : -1;
  const quota = f.quota ? d.index.quota.get(f.quota) ?? -2 : -1;
  const seat = f.seat ? d.acat.indexOf(f.seat) : -1;
  const q = f.q.trim().toLowerCase();
  const hits: number[] = [];
  for (let k = 0; k < d.n; k++) {
    if (col.rd[k] !== rd) continue;
    const rank = col.rank[k];
    if ((f.min && rank < f.min) || (f.max && rank > f.max)) continue;
    if (branch !== -1 && col.course[k] !== branch) continue;
    if (quota !== -1 && col.quota[k] !== quota) continue;
    if (seat !== -1 && col.acat[k] !== seat) continue;
    const inst = d.inst[col.inst[k]];
    if (f.state && inst.state !== f.state) continue;
    if (q && !inst.full.toLowerCase().includes(q)) continue;
    hits.push(k);
  }
  const start = (f.page - 1) * PAGE_SIZE;
  return {
    total: hits.length,
    rows: hits.slice(start, start + PAGE_SIZE).map((k) => {
      const inst = d.inst[col.inst[k]];
      return {
        rank: col.rank[k], institute: inst.name, state: inst.state, branch: d.course[col.course[k]].label, quota: d.quota[col.quota[k]].label,
        seatCategory: d.acat[col.acat[k]], candidateCategory: d.ccat[col.ccat[k]], page: col.page[k], pdf: pdfHref(d, rd, col.page[k]),
      };
    }),
  };
}

// ---- branch cutoffs ----

export function cutoffs(year: number, rounds: RoundSet, quotaId: string, seat: string, program: Program) {
  const d = getData();
  const qi = d.index.quota.get(quotaId) ?? 0, ai = Math.max(0, d.acat.indexOf(seat));
  const stats = (y: number) => {
    const by = new Map<number, { open: number; close: number; allotted: number; institutes: number }>();
    for (const g of groupsFor(y, rounds).values()) {
      if (g.quota !== qi || g.acat !== ai || (program && d.course[g.course].program !== program)) continue;
      const s = by.get(g.course);
      if (!s) by.set(g.course, { open: g.open, close: g.close, allotted: g.n, institutes: 1 });
      else { s.open = Math.min(s.open, g.open); s.close = Math.max(s.close, g.close); s.allotted += g.n; s.institutes++; }
    }
    return by;
  };
  const main = stats(year), others = d.years.filter((y) => y !== year);
  const otherStats = others.map(stats);
  return {
    otherYears: others,
    rows: [...main.entries()].sort((a, b) => a[1].close - b[1].close).map(([c, s]) => ({
      branchId: d.course[c].id, branch: d.course[c].label, ...s,
      otherClosing: otherStats.map((o) => o.get(c)?.close ?? null),
    })),
  };
}

// ---- rank scan ----

const rankIndexCache = new Map<number, Map<number, number[]>>();
/** rank → allotment row ids, for one season. */
function rankIndex(year: number) {
  const hit = rankIndexCache.get(year);
  if (hit) return hit;
  const d = getData(), idx = new Map<number, number[]>();
  for (let k = 0; k < d.n; k++) {
    if (d.rounds[d.col.rd[k]].year !== year) continue;
    const r = d.col.rank[k], a = idx.get(r);
    if (a) a.push(k); else idx.set(r, [k]);
  }
  rankIndexCache.set(year, idx);
  return idx;
}

export const RANK_SCAN_MAX = 200;

/**
 * What each rank in [from, to] was allotted, round by round, in one MCC season. Rounds 2/3 list only new seats,
 * so a rank with nothing in a later round kept its earlier seat (or had left the process).
 */
export function rankScan(year: number, from: number, to: number) {
  const d = getData();
  const rounds = d.rounds.map((r, i) => ({ ...r, i })).filter((r) => r.year === year);
  const idx = rankIndex(year);
  const hi = Math.min(to, from + RANK_SCAN_MAX - 1);
  const rows = [];
  for (let rank = from; rank <= hi; rank++) {
    const ks = idx.get(rank) ?? [];
    const held = new Set<string>();
    const cells = rounds.map((rd) => {
      const k = ks.find((x) => d.col.rd[x] === rd.i);
      if (k == null) return null;
      const inst = d.inst[d.col.inst[k]];
      const cell = {
        status: held.has(rd.counselling) ? 'Upgraded' : 'Allotted', institute: inst.name, instId: inst.id, code: inst.code, state: inst.state,
        branch: d.course[d.col.course[k]].label, quota: d.quota[d.col.quota[k]].label, seatCategory: d.acat[d.col.acat[k]],
        pdf: pdfHref(d, rd.i, d.col.page[k]),
      };
      held.add(rd.counselling);
      return cell;
    });
    const cat = ks.length ? d.ccat[d.col.ccat[ks[0]]] : null;
    rows.push({ rank, candidateCategory: cat, cells });
  }
  return { rounds: rounds.map((r) => ({ id: r.id, label: r.label, counselling: r.counselling })), rows };
}

// ---- saved choices ----

/** A saved choice: season + institute + branch + quota, all stable ids. */
export const choiceKey = (year: number, instId: string, branchId: string, quotaId: string) => `${year}~${instId}~${branchId}~${quotaId}`;

export function choiceDetails(keys: string[], p: Pick<Profile, 'rank' | 'cat' | 'pwd' | 'rounds'> & { scat?: string }) {
  const d = getData();
  const catsFor = seatCatsFor(p);
  return keys.map((key) => {
    const [y, instId, branchId, quotaId] = key.split('~');
    const ii = d.index.inst.get(instId), ci = d.index.course.get(branchId), qi = d.index.quota.get(quotaId);
    if (ii == null || ci == null || qi == null) return { key, missing: true as const };
    const groups = groupsFor(Number(y), p.rounds);
    let best: Group | null = null;
    for (const a of catsFor(qi)) { const g = groups.get(`${ii}.${ci}.${qi}.${a}`); if (g && (!best || g.close > best.close)) best = g; }
    return {
      key, missing: false as const, year: Number(y), institute: d.inst[ii].name, state: d.inst[ii].state,
      branch: d.course[ci].label, quota: d.quota[qi].label,
      closingRank: best?.close ?? null, band: best ? bandOf(p.rank, best.close) : null,
    };
  });
}
