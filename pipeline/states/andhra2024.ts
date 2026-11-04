/**
 * Andhra Pradesh NEET PG 2024-25 (Dr NTR UHS) college-wise allotment lists → allotments in the same shape as the 2025
 * closing-rank rows (pipeline/states/andhra.py), so build-dataset maps them the same way.
 *
 * The 2024-25 last-rank tool is gone, but the college-wise allotment PDFs (notification/Admission/2024-25/medicalpg/…)
 * survive as Internet Archive copies. Each list is grouped under a college heading:
 *   S.No. | NEET RANK | NEET Roll No | [Score] | Name | Gender | [Muslim Minority] | Category | Local Area | Allotment Details | [Speciality] | Phase
 * Allotment Details:
 *   CQ: COLLEGE - SUBJECT - AREA - SEATCAT[-PH] - G|F [- MRC] [- CON] --- seat no.   (AREA: AU, SVU, APUR = unreserved, APL)
 *   MQ: COLLEGE - SUBJECT - S1|S1A|S1B|S2|S3 --- seat no.   (S1/S1A/S1B = Management (Category B), S2 = NRI, S3 = Institutional)
 * Later lists re-list seats held from earlier phases; the Phase column says when each seat was allotted, so only rows of the
 * list's own phase are kept. Names and roll numbers are never written.
 *
 * Usage: tsx pipeline/states/andhra2024.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/andhra/2024';
const WB = 'https://web.archive.org/web/';
const OFF = 'https://drntr.uhsap.in/index/notification/Admission/2024-25/medicalpg/';
// [file, seat (CQ/MQ), sub (CQ: Non-Service/Service), out file, round label, phase cell, archive timestamp, official file name]
const LISTS: [string, string, string, string, string, RegExp, string, string][] = [
  ['ap2024_cq_ns_p1', 'CQ', 'Non-Service', 'ap2024_r1', 'Round 1', /^Phase-(I|1)$/, '20241213184133', 'PG (Medical) Admissions 2024-25 - College wise Allotment list under CQ Non-service Phase-I.pdf'],
  ['ap2024_cq_s_p1', 'CQ', 'Service', 'ap2024_r1', 'Round 1', /^Phase-(I|1)$/, '20241202193717', 'PG (Medical) Admissions 2024-25 - College wise Allotment list under CQ Service Phase-I.pdf'],
  ['ap2024_mq_p1', 'MQ', '', 'ap2024_r1', 'Round 1', /^Phase-(I|1)$/, '20241202191650', 'PG (Medical) Admissions 2024-25 - MQ Phase-I College wise Allotments list.pdf'],
  ['ap2024_cq_ns_p2', 'CQ', 'Non-Service', 'ap2024_r2', 'Round 2', /^Phase-(II|2)$/, '20250113171333', 'PG (Medical) CQ 2024-25 - Phase-II Non-service College wise Allotments.pdf'],
  ['ap2024_cq_s_p2', 'CQ', 'Service', 'ap2024_r2', 'Round 2', /^Phase-(II|2)$/, '20250214231427', 'PG (Medical) CQ 2024-25 - In-Service Phase-II College wise Allotment list.pdf'],
  ['ap2024_mq_p2', 'MQ', '', 'ap2024_r2', 'Round 2', /^Phase-(II|2)$/, '20250113170639', 'PG (Medical) MQ 2024-25 - Phase-II College wise Allotments.pdf'],
  ['ap2024_cq_ns_p3', 'CQ', 'Non-Service', 'ap2024_r3', 'Round 3', /^Phase-(III|3)$/, '20250322025451', 'PG (Medical) CQ 2024-25 - Non-service Phase-III (Mop Up) College Wise Allotment list.pdf'],
  ['ap2024_mq_p3', 'MQ', '', 'ap2024_r3', 'Round 3', /^Phase-(III|3)$/, '20250322031824', 'PG (Medical) Admissions 2024-25 - MQ Phase-III (Mop Up) College Wise Allotment list.pdf'],
  // the stray round was re-issued ("Revised"); Stray Vacancy Round-1 is a second stray pass, filed with it
  ['ap2024_cq_ns_stray', 'CQ', 'Non-Service', 'ap2024_r4', 'Stray', /^Stray$/, '20250322034301', 'PG (Medical) CQ 2024-25 - Revised College wise Allotment list of Non-service under Stray Vacancy Round.pdf'],
  ['ap2024_cq_ns_stray1', 'CQ', 'Non-Service', 'ap2024_r4', 'Stray', /^Stray-1$/, '20250322031346', 'PG (Medical) CQ 2024-25 - College wise Allotment list of Non-service under Stray Vacancy Round-1.pdf'],
  ['ap2024_mq_stray', 'MQ', '', 'ap2024_r4', 'Stray', /^Stray$/, '20250322032610', 'PG (Medical) MQ 2024-25 - College wise Allotment list under Stray Vacancy Round.pdf'],
  ['ap2024_mq_stray1', 'MQ', '', 'ap2024_r4', 'Stray', /^Stray-1$/, '20250322025053', 'PG (Medical) MQ 2024-25 - College wise Allotment list under Stray Vacancy Round-1.pdf'],
  ['ap2024_cq_ns_sstray', 'CQ', 'Non-Service', 'ap2024_r5', 'Special stray', /^Spl Stray$/, '20250322024427', 'PG (Medical) CQ 2024-25 - College Wise Allotment list of Non-service under Special Stray Vacancy Round.pdf'],
];
// subject codes (the MQ lists print the name next to the code; codes seen only in CQ lists are named by hand)
const SUBJECT: Record<string, string> = {
  GM: 'MD General Medicine', PAED: 'MD Paediatrics', OBG: 'MS Obstetrics and Gynaecology', PM: 'MD Respiratory Medicine', ANES: 'MD Anaesthesiology',
  OPTHAL: 'MS Ophthalmology', PSY: 'MD Psychiatry', SPM: 'MD Community Medicine', FM: 'MD Forensic Medicine', RD: 'MD Radio-Diagnosis',
  DVL: 'MD Dermatology, Venereology and Leprosy', GS: 'MS General Surgery', ENT: 'MS Otorhinolaryngology', ORTHO: 'MS Orthopaedics',
  RT: 'MD Radiation Oncology', PATH: 'MD Pathology', MICRO: 'MD Microbiology', PHARM: 'MD Pharmacology', BIO: 'MD Biochemistry',
  PHY: 'MD Physiology', ANAT: 'MD Anatomy', EM: 'MD Emergency Medicine', FAM: 'MD Family Medicine', HA: 'MD Hospital Administration',
  NM: 'MD Nuclear Medicine', TM: 'MD Immuno Haematology and Blood Transfusion', DPM: 'Diploma in Psychological Medicine',
  DPH: 'Diploma in Public Health', DCP: 'Diploma in Clinical Pathology', DDVL: 'Diploma in Dermatology, Venereology and Leprosy',
  DLO: 'Diploma in Oto-Rhino-Laryngology',
};
const MQ_SUB: Record<string, string> = { S1: 'Management', S1A: 'Management', S1B: 'Management', S2: 'NRI', S3: 'Institutional' };
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
const clean = (s: string) => (s ?? '').replace(/\s+/g, ' ').trim();

// college name → NTR UHS college code, from the 2025 last-rank data
// (a college without a code in 2025 is matched by its 2025 name instead, so both years share one institute)
const codeOf = new Map<string, [string, string]>();
for (const f of ['ap2025_r1', 'ap2025_r2', 'ap2025_r3', 'ap2025_r4'])
  for (const r of JSON.parse(readFileSync(`data/parsed/${f}.json`, 'utf8')).rows) codeOf.set(key(r.institute), [r.collegeCode, r.institute]);
const match2025 = (name: string): [string, string] | null => {
  const k = key(name);
  if (codeOf.has(k)) return codeOf.get(k)!;
  // 2025 names drop punctuation/commas and sometimes the town; match on the longest shared prefix of 20+ letters
  let best: [string, string] | null = null, len = 0;
  for (const [n, c] of codeOf) { let i = 0; while (i < n.length && i < k.length && n[i] === k[i]) i++; if (i > len) { len = i; best = c; } }
  return len >= 20 ? best : null;
};
const matchCode = (name: string) => match2025(name)?.[0] ?? '';

const out = new Map<string, { label: string; files: string[]; urls: string[]; rows: any[] }>();
const subjVotes = new Map<string, Map<string, number>>(), unknownSubj = new Map<string, number>(), colleges = new Map<string, string>();
for (const [file, seat, sub, outFile, label, phase, ts, name] of LISTS) {
  let col: Record<string, number> | null = null, college = '', kept = 0, held = 0, bad = 0;
  const g = out.get(outFile) ?? { label, files: [], urls: [], rows: [] };
  g.files.push(file); g.urls.push(`${WB}${ts}/${OFF}${encodeURI(name)}`);
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) for (const c of gridTable(pg).rows) {
    if (c[0] === 'S.No.') {
      const f = (re: RegExp) => c.findIndex((x) => re.test(x));
      col = { rank: f(/^NEET RANK$/), cat: f(/^Category$/), area: f(/^Local Area$/), det: f(/^Allotment Details$/), spec: f(/^(Speciality|Branch Name)$/), phase: f(/^Phase$/) };
      continue;
    }
    if (!/^\d+$/.test(c[0] ?? '')) {
      const head = c.join('').replace(/\s+/g, ' ').trim();
      // college heading: a single run of text naming a college (skip the title and "Note:" lines)
      if (/(College|Institute|Medical|Sciences|SVIMS|Hospital)/i.test(head) && !/University of Health|Note:|Classes|Allot?ment List/i.test(head) && head.length < 140) college = head;
      continue;
    }
    if (!col) continue;
    const det = clean(c[col.det]);
    if (!phase.test(clean(c[col.phase]))) { held++; continue; }
    const t = det.replace(/[\s-]*\d+\s*$/, '').split(/\s*-\s*/).map((s) => s.trim()).filter(Boolean);
    const rank = Number((c[col.rank] ?? '').replace(/\D/g, ''));
    if (!rank || t.length < 2) { bad++; continue; }
    const [abbr, subj] = t;
    colleges.set(abbr, college);
    if (col.spec >= 0 && c[col.spec]) { const v = subjVotes.get(subj) ?? new Map(); v.set(clean(c[col.spec]), (v.get(clean(c[col.spec])) ?? 0) + 1); subjVotes.set(subj, v); }
    const course = SUBJECT[subj];
    if (!course) { unknownSubj.set(subj, (unknownSubj.get(subj) ?? 0) + 1); bad++; continue; }
    let row: any;
    if (seat === 'MQ') {
      const s = MQ_SUB[t[2]] ?? 'Management';
      row = { seat: 'MQ', sub: s, allottedCategory: s, area: t[2] === 'S1B' ? 'AP' : clean(c[col.area]) };
    } else if (t.length === 2) {
      // CQ stray rounds print no seat category or area: the seats are open (2025's stray last ranks are all OC), area = candidate's
      row = { seat: 'CQ', sub, allottedCategory: 'OC', area: clean(c[col.area]) };
    } else {
      const pwd = t[4] === 'PH';
      row = { seat: 'CQ', sub, allottedCategory: t[3] + (pwd ? ' - PH' : ''), area: t[2] === 'APUR' || t[2] === 'APL' ? 'Others' : t[2], female: t[pwd ? 5 : 4] === 'F' };
    }
    const m = match2025(college);
    g.rows.push({ rank, institute: m && !m[0] ? m[1] : college, collegeCode: m ? m[0] : abbr, course, ...row, candidateCategory: clean(c[col.cat]), remarks: '', page: pg.index + 1 });
    kept++;
  }
  out.set(outFile, g);
  console.log(`${file}: ${kept} allotted in this phase, ${held} held from earlier phases, ${bad} unreadable`);
}
for (const [file, g] of out) {
  g.rows.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: g.urls[0], url: g.urls[0], counselling: 'Andhra Pradesh', year: 2024, round: g.label, rows: g.rows }));
  console.log(`${file} (${g.label}): ${g.rows.length} allotments from ${g.files.join(', ')}`);
}
console.log('subject names printed in MQ lists', Object.fromEntries([...subjVotes].map(([k, v]) => [k, [...v].sort((a, b) => b[1] - a[1])[0][0]])));
if (unknownSubj.size) console.log('UNKNOWN subject codes', Object.fromEntries(unknownSubj));
console.log('colleges', Object.fromEntries([...colleges].map(([a, n]) => [a, `${n} → ${matchCode(n) || '(no 2025 code)'}`])));
