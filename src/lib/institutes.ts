/**
 * Seat-matrix, seat-change and institute queries. Institutes here are MCC institute codes (stable across
 * seasons), so one institute page covers every year it took part.
 */
import { getData, groupsFor, type Program, type RoundSet } from './data';

const num = (v: unknown) => (typeof v === 'number' && v > 0 ? v : null);

// ---- seat matrix ----

export type MatrixFilters = { year: number; quota: string; seat: string; state: string; branch: string; program: Program; q: string; page: number };
export const MATRIX_PAGE = 50;

/** Seats per (institute, branch, quota) for one season, with the previous season's total alongside. */
export function seatMatrix(f: MatrixFilters) {
  const d = getData(), m = d.matrix;
  const qi = f.quota ? d.index.quota.get(f.quota) ?? -2 : -1;
  const ai = f.seat ? d.acat.indexOf(f.seat) : -1;
  const bi = f.branch ? d.index.course.get(f.branch) ?? -2 : -1;
  const q = f.q.trim().toLowerCase();
  type Agg = { code: number; course: number; quota: number; seats: number; prev: number; byCat: Record<string, number> };
  const by = new Map<string, Agg>();
  for (let k = 0; k < m.n; k++) {
    const y = m.year[k];
    if (y !== f.year && y !== f.year - 1) continue;
    if (qi !== -1 && m.quota[k] !== qi) continue;
    if (ai !== -1 && m.acat[k] !== ai) continue;
    if (bi !== -1 && m.course[k] !== bi) continue;
    if (f.program && d.course[m.course[k]].program !== f.program) continue;
    const c = d.codes[m.code[k]];
    if (f.state && c.state !== f.state) continue;
    if (q && !c.name.toLowerCase().includes(q)) continue;
    const key = `${m.code[k]}.${m.course[k]}.${m.quota[k]}`;
    let a = by.get(key);
    if (!a) by.set(key, (a = { code: m.code[k], course: m.course[k], quota: m.quota[k], seats: 0, prev: 0, byCat: {} }));
    if (y === f.year) { a.seats += m.seats[k]; a.byCat[d.acat[m.acat[k]]] = (a.byCat[d.acat[m.acat[k]]] ?? 0) + m.seats[k]; }
    else a.prev += m.seats[k];
  }
  const list = [...by.values()].filter((a) => a.seats > 0)
    .sort((a, b) => d.codes[a.code].name.localeCompare(d.codes[b.code].name) || d.course[a.course].label.localeCompare(d.course[b.course].label));
  const hasPrev = d.matrix.year.includes(f.year - 1);
  const total = list.reduce((s, a) => s + a.seats, 0);
  const start = (f.page - 1) * MATRIX_PAGE;
  return {
    rows: list.slice(start, start + MATRIX_PAGE).map((a) => ({
      code: d.codes[a.code].code, institute: d.codes[a.code].name, state: d.codes[a.code].state,
      branch: d.course[a.course].label, quota: d.quota[a.quota].label, seats: a.seats, byCat: a.byCat,
      change: hasPrev ? a.seats - a.prev : null,
    })),
    count: list.length, totalSeats: total, hasPrev,
  };
}

// ---- seat changes (year over year) ----

export type ChangeKind = 'all' | 'new' | 'increased' | 'decreased' | 'removed';

/** Seat totals per (institute, branch, quota) in one season vs the season before. */
export function seatChanges(year: number, opts: { kind: ChangeKind; state: string; branch: string; program: Program; limit: number }) {
  const d = getData(), m = d.matrix;
  const bi = opts.branch ? d.index.course.get(opts.branch) ?? -2 : -1;
  const by = new Map<string, { code: number; course: number; quota: number; now: number; prev: number }>();
  for (let k = 0; k < m.n; k++) {
    const y = m.year[k];
    if (y !== year && y !== year - 1) continue;
    if (bi !== -1 && m.course[k] !== bi) continue;
    if (opts.program && d.course[m.course[k]].program !== opts.program) continue;
    if (opts.state && d.codes[m.code[k]].state !== opts.state) continue;
    const key = `${m.code[k]}.${m.course[k]}.${m.quota[k]}`;
    let a = by.get(key);
    if (!a) by.set(key, (a = { code: m.code[k], course: m.course[k], quota: m.quota[k], now: 0, prev: 0 }));
    if (y === year) a.now += m.seats[k]; else a.prev += m.seats[k];
  }
  const kindOf = (a: { now: number; prev: number }): ChangeKind =>
    a.prev === 0 ? 'new' : a.now === 0 ? 'removed' : a.now > a.prev ? 'increased' : a.now < a.prev ? 'decreased' : 'all';
  const all = [...by.values()];
  const summary = { new: 0, increased: 0, decreased: 0, removed: 0, seatsNow: 0, seatsPrev: 0 };
  for (const a of all) {
    summary.seatsNow += a.now; summary.seatsPrev += a.prev;
    const k = kindOf(a);
    if (k === 'new') summary.new += a.now; else if (k === 'removed') summary.removed += a.prev;
    else if (k === 'increased') summary.increased += a.now - a.prev; else if (k === 'decreased') summary.decreased += a.prev - a.now;
  }
  // Per-branch net change, to show where seats were added.
  const branchNet = new Map<number, { now: number; prev: number }>();
  for (const a of all) { const b = branchNet.get(a.course) ?? { now: 0, prev: 0 }; b.now += a.now; b.prev += a.prev; branchNet.set(a.course, b); }
  const changed = all.filter((a) => a.now !== a.prev && (opts.kind === 'all' || kindOf(a) === opts.kind))
    .sort((a, b) => Math.abs(b.now - b.prev) - Math.abs(a.now - a.prev));
  return {
    summary,
    branches: [...branchNet.entries()].map(([c, v]) => ({ branchId: d.course[c].id, branch: d.course[c].label, ...v, delta: v.now - v.prev }))
      .filter((b) => b.delta !== 0).sort((a, b) => b.delta - a.delta),
    count: changed.length,
    rows: changed.slice(0, opts.limit).map((a) => ({
      code: d.codes[a.code].code, institute: d.codes[a.code].name, state: d.codes[a.code].state, branch: d.course[a.course].label,
      quota: d.quota[a.quota].label, prev: a.prev, now: a.now, kind: kindOf(a),
    })),
  };
}

// ---- institutes ----

export type InstituteSort = 'name' | 'stipend' | 'fee' | 'seats';

export function listInstitutes(opts: { q: string; state: string; type: string; sort: InstituteSort; page: number }) {
  const d = getData(), m = d.matrix;
  const latest = Math.max(...Array.from(m.year));
  const seats = new Map<number, number>(), branches = new Map<number, Set<number>>();
  for (let k = 0; k < m.n; k++) {
    if (m.year[k] !== latest) continue;
    seats.set(m.code[k], (seats.get(m.code[k]) ?? 0) + m.seats[k]);
    const s = branches.get(m.code[k]) ?? new Set(); s.add(m.course[k]); branches.set(m.code[k], s);
  }
  const q = opts.q.trim().toLowerCase();
  const list = d.codes.map((c, i) => {
    const p = d.profiles[c.code] ?? {};
    return { ...c, seats: seats.get(i) ?? 0, branches: branches.get(i)?.size ?? 0,
      feeY1: num(p.feeY1) ?? num(p.annualFee), stipendY1: num(p.stipendY1), hasProfile: !!d.profiles[c.code] };
  }).filter((c) => (!q || c.name.toLowerCase().includes(q) || c.code === q) && (!opts.state || c.state === opts.state) && (!opts.type || c.type.includes(opts.type)));
  const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) => (a == null ? 1 : b == null ? -1 : dir * (a - b));
  // Most institutes declare a monthly stipend; a few declare it per year or write junk. Sort on a monthly estimate.
  const monthly = (v: number | null) => (v == null || v < 1000 ? null : v > 300000 ? v / 12 : v);
  list.sort(opts.sort === 'stipend' ? (a, b) => nullsLast(monthly(a.stipendY1), monthly(b.stipendY1), -1)
    : opts.sort === 'fee' ? (a, b) => nullsLast(a.feeY1, b.feeY1, 1)
    : opts.sort === 'seats' ? (a, b) => b.seats - a.seats : (a, b) => a.name.localeCompare(b.name));
  const start = (opts.page - 1) * MATRIX_PAGE;
  return { latest, count: list.length, rows: list.slice(start, start + MATRIX_PAGE) };
}

export const INSTITUTE_TYPES = ['Government / AIQ', 'Central university', 'Deemed university', 'DNB hospital'];

/** Everything known about one MCC institute: profile, seats per season, and closing ranks per season. */
export function instituteDetail(code: string, rounds: RoundSet = 'main') {
  const d = getData();
  const ci = d.index.code.get(code);
  if (ci == null) return null;
  const info = d.codes[ci];
  const years = [...d.years].sort((a, b) => a - b);

  // Seats: branch+quota → year → seats
  const seatMap = new Map<string, { course: number; quota: number; byYear: Record<number, number> }>();
  const m = d.matrix;
  for (let k = 0; k < m.n; k++) {
    if (m.code[k] !== ci) continue;
    const key = `${m.course[k]}.${m.quota[k]}`;
    let s = seatMap.get(key);
    if (!s) seatMap.set(key, (s = { course: m.course[k], quota: m.quota[k], byYear: {} }));
    s.byYear[m.year[k]] = (s.byYear[m.year[k]] ?? 0) + m.seats[k];
  }

  // Closing ranks for Open seats: branch+quota → year → closing rank
  const instIdx = new Set<number>(); d.instCode.forEach((c, i) => { if (c === ci) instIdx.add(i); });
  const open = d.acat.indexOf('Open');
  const closing = new Map<string, Record<number, number>>();
  for (const y of years) {
    for (const g of groupsFor(y, rounds).values()) {
      if (!instIdx.has(g.inst) || g.acat !== open) continue;
      const key = `${g.course}.${g.quota}`;
      const c = closing.get(key) ?? {}; c[y] = Math.max(c[y] ?? 0, g.close); closing.set(key, c);
    }
  }
  const keys = new Set([...seatMap.keys(), ...closing.keys()]);
  const programs = [...keys].map((key) => {
    const [course, quota] = key.split('.').map(Number);
    return {
      branchId: d.course[course].id, branch: d.course[course].label, quota: d.quota[quota].label,
      seats: years.map((y) => seatMap.get(key)?.byYear[y] ?? null),
      closing: years.map((y) => closing.get(key)?.[y] ?? null),
    };
  }).sort((a, b) => a.branch.localeCompare(b.branch) || a.quota.localeCompare(b.quota));

  const p = d.profiles[code] ?? null;
  return {
    ...info, years, programs,
    profile: p && {
      notes: (['feeY1', 'feeY2', 'feeY3', 'annualFee', 'stipendY1', 'stipendY2', 'stipendY3'] as const)
        .map((k) => p[`${k}Text`]).filter((t): t is string => typeof t === 'string'),
      feeY1: num(p.feeY1), feeY2: num(p.feeY2), feeY3: num(p.feeY3), annualFee: num(p.annualFee),
      stipendY1: num(p.stipendY1), stipendY2: num(p.stipendY2), stipendY3: num(p.stipendY3),
      feeAtAdmission: num(p.feeAtAdmission),
      nriFeeY1: num(p.nriFeeY1),
      hostelMale: p.hostelMale === 'Y' ? true : p.hostelMale === 'N' ? false : null,
      hostelFemale: p.hostelFemale === 'Y' ? true : p.hostelFemale === 'N' ? false : null,
      reallocationDeduction: num(p.reallocationDeduction), resignRefund: num(p.resignRefund), forfeitOnResign: num(p.forfeitOnResign),
      university: typeof p.university === 'string' ? p.university : null,
      address: typeof p.address === 'string' ? p.address : null,
      website: typeof p.website === 'string' && p.website !== '0' ? p.website : null,
    },
    profileSource: d.profileSource,
  };
}
