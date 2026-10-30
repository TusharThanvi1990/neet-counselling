/**
 * The MCC allotment dataset, loaded once per server instance from data/pgdata.json
 * (built by `npm run data:build` — see pipeline/README.md).
 *
 * Rows are stored column-wise in typed arrays: 200k+ allotments stay small and fast to scan.
 * Institute / branch / quota ids are stable across rebuilds, so they are safe in URLs and saved lists.
 */
import fs from 'node:fs';
import path from 'node:path';

export type Round = { id: string; year: number; label: string; url: string; count: number };
export type Institute = { id: string; name: string; full: string; state: string; code: string };
/** An institute as MCC registers it (stable 6-digit code), across all seasons. */
export type CodedInstitute = { code: string; name: string; state: string; type: string };
export type Profile = Record<string, string | number | null>;
export type Named = { id: string; label: string };

type Raw = {
  meta: { builtAt: string; portal: string; archive: string };
  rounds: Round[];
  inst: [string, string, string, string, string][];
  codes: [string, string, string, string][];
  matrix: number[];
  profiles: Record<string, Profile>;
  profileSource: string;
  matrixSources: { year: number; kind: string; url: string; seats: number }[];
  course: [string, string][];
  quota: [string, string][];
  acat: string[];
  ccat: string[];
  rows: number[];
};

export type Dataset = {
  meta: Raw['meta'];
  rounds: Round[];
  years: number[];
  inst: Institute[];
  course: (Named & { program: Program })[];
  quota: Named[];
  acat: string[];
  ccat: string[];
  states: string[];
  codes: CodedInstitute[];
  profiles: Record<string, Profile>;
  profileSource: string;
  matrixSources: Raw['matrixSources'];
  /** Seat matrices: one entry per (season, institute code, branch, quota, seat category). */
  matrix: { year: Int32Array; code: Int32Array; course: Int32Array; quota: Int32Array; acat: Int32Array; seats: Int32Array; n: number };
  /** `${year}.${codeIdx}.${course}.${quota}.${acat}` → seats. */
  seatIndex: Map<string, number>;
  /** institute index → code index (-1 when the institute could not be linked to an MCC code). */
  instCode: Int32Array;
  /** Column arrays, one entry per allotment. */
  col: { rd: Int32Array; rank: Int32Array; inst: Int32Array; course: Int32Array; quota: Int32Array; acat: Int32Array; ccat: Int32Array; page: Int32Array };
  n: number;
  index: { inst: Map<string, number>; course: Map<string, number>; quota: Map<string, number>; code: Map<string, number> };
};

export const PROGRAMS = ['MD/MS', 'DNB', 'Diploma', '6-yr'] as const;
export type Program = (typeof PROGRAMS)[number] | '';
const programOf = (label: string): Program =>
  /6-yr/.test(label) ? '6-yr' : /\(DNB\)/.test(label) ? 'DNB' : /Diploma\)/.test(label) ? 'Diploma' : /\(MD\/MS\)|\(M\.Ch\)/.test(label) ? 'MD/MS' : '';

let cached: Dataset | null = null;

export function getData(): Dataset {
  if (cached) return cached;
  const raw: Raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'pgdata.json'), 'utf8'));
  const W = 8, n = raw.rows.length / W;
  const make = () => new Int32Array(n);
  const col = { rd: make(), rank: make(), inst: make(), course: make(), quota: make(), acat: make(), ccat: make(), page: make() };
  for (let k = 0; k < n; k++) {
    const o = k * W;
    col.rd[k] = raw.rows[o]; col.rank[k] = raw.rows[o + 1]; col.inst[k] = raw.rows[o + 2]; col.course[k] = raw.rows[o + 3];
    col.quota[k] = raw.rows[o + 4]; col.acat[k] = raw.rows[o + 5]; col.ccat[k] = raw.rows[o + 6]; col.page[k] = raw.rows[o + 7];
  }
  const inst = raw.inst.map(([id, name, full, state, code]) => ({ id, name, full, state, code }));
  const codes = raw.codes.map(([code, name, state, type]) => ({ code, name, state, type }));
  const codeIndex = new Map(codes.map((c, i) => [c.code, i]));
  const M = 6, mn = raw.matrix.length / M;
  const mk = () => new Int32Array(mn);
  const matrix = { year: mk(), code: mk(), course: mk(), quota: mk(), acat: mk(), seats: mk(), n: mn };
  const seatIndex = new Map<string, number>();
  for (let k = 0; k < mn; k++) {
    const o = k * M;
    matrix.year[k] = raw.matrix[o]; matrix.code[k] = raw.matrix[o + 1]; matrix.course[k] = raw.matrix[o + 2];
    matrix.quota[k] = raw.matrix[o + 3]; matrix.acat[k] = raw.matrix[o + 4]; matrix.seats[k] = raw.matrix[o + 5];
    const key = `${matrix.year[k]}.${matrix.code[k]}.${matrix.course[k]}.${matrix.quota[k]}.${matrix.acat[k]}`;
    seatIndex.set(key, (seatIndex.get(key) ?? 0) + matrix.seats[k]);
  }
  const course = raw.course.map(([id, label]) => ({ id, label, program: programOf(label) }));
  const quota = raw.quota.map(([id, label]) => ({ id, label }));
  cached = {
    meta: raw.meta,
    rounds: raw.rounds,
    years: [...new Set(raw.rounds.map((r) => r.year))].sort((a, b) => b - a),
    inst, course, quota, acat: raw.acat, ccat: raw.ccat,
    codes, profiles: raw.profiles, profileSource: raw.profileSource, matrixSources: raw.matrixSources, matrix, seatIndex,
    instCode: Int32Array.from(inst, (x) => (x.code ? codeIndex.get(x.code) ?? -1 : -1)),
    states: [...new Set(inst.map((i) => i.state).filter(Boolean))].sort(),
    col, n,
    index: {
      inst: new Map(inst.map((x, i) => [x.id, i])),
      course: new Map(course.map((x, i) => [x.id, i])),
      quota: new Map(quota.map((x, i) => [x.id, i])),
      code: codeIndex,
    },
  };
  return cached;
}

// ---- closing ranks ----

export type RoundSet = 'r1' | 'main' | 'all';
export const ROUND_SETS: { id: RoundSet; label: string }[] = [
  { id: 'main', label: 'Rounds 1–3' },
  { id: 'r1', label: 'Round 1 only' },
  { id: 'all', label: 'All rounds incl. stray' },
];
const ROUND_LABELS: Record<RoundSet, string[] | null> = { r1: ['Round 1'], main: ['Round 1', 'Round 2', 'Round 3'], all: null };

export function roundIds(d: Dataset, year: number, set: RoundSet): Set<number> {
  const allow = ROUND_LABELS[set];
  return new Set(d.rounds.map((r, i) => (r.year === year && (!allow || allow.includes(r.label)) ? i : -1)).filter((i) => i >= 0));
}

/** One seat type at one institute: everyone allotted it in the chosen rounds. */
export type Group = { key: string; inst: number; course: number; quota: number; acat: number; open: number; close: number; n: number; closeRound: number; closePage: number };

const groupCache = new Map<string, Map<string, Group>>();

/** Closing ranks per (institute, branch, quota, seat category) for one season + round set. */
export function groupsFor(year: number, set: RoundSet): Map<string, Group> {
  const ck = `${year}:${set}`;
  const hit = groupCache.get(ck);
  if (hit) return hit;
  const d = getData(), ids = roundIds(d, year, set), { col } = d, groups = new Map<string, Group>();
  for (let k = 0; k < d.n; k++) {
    if (!ids.has(col.rd[k])) continue;
    const key = `${col.inst[k]}.${col.course[k]}.${col.quota[k]}.${col.acat[k]}`, rank = col.rank[k];
    let g = groups.get(key);
    if (!g) {
      g = { key, inst: col.inst[k], course: col.course[k], quota: col.quota[k], acat: col.acat[k], open: rank, close: rank, n: 0, closeRound: col.rd[k], closePage: col.page[k] };
      groups.set(key, g);
    }
    g.n++;
    if (rank > g.close) { g.close = rank; g.closeRound = col.rd[k]; g.closePage = col.page[k]; }
    if (rank < g.open) g.open = rank;
  }
  groupCache.set(ck, groups);
  return groups;
}

export const latestFullYear = (d: Dataset) => d.years.find((y) => d.rounds.filter((r) => r.year === y).length >= 3) ?? d.years[0];
export const yearLabel = (d: Dataset, y: number) => {
  const rs = d.rounds.filter((r) => r.year === y);
  return rs.length < 3 ? `${y} (${rs.map((r) => r.label).join(', ')} so far)` : `${y} season`;
};
/** Seats in MCC's opening seat matrix for one allotment group's seat type, if the institute is linked. */
export function seatsFor(d: Dataset, year: number, g: { inst: number; course: number; quota: number; acat: number }) {
  const ci = d.instCode[g.inst];
  return ci < 0 ? null : d.seatIndex.get(`${year}.${ci}.${g.course}.${g.quota}.${g.acat}`) ?? null;
}

export const pdfHref = (d: Dataset, round: number, page: number) => `${d.rounds[round].url}#page=${page}`;
