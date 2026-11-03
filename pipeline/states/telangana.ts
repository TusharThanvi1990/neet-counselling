/**
 * Telangana NEET PG state counselling (KNRUHS) → allotments in the same shape as MCC rounds.
 *
 * KNRUHS publishes "College wise allotment list" PDFs per phase, for the Competent Authority quota (CQ) and the
 * Management quota (MQ). They are fixed-width text, grouped by college and course:
 *   COLL :: NIMS(001) - NIZAM INSTITUTE OF MEDICAL SCIENCES, HYD
 *   CRS  :: GM (001) - MD(GENERAL MEDICINE)
 *   RANK  ROLL_NO  SCORE  CANDIDATE_NAME  [LOC]  CAT  SX  MIN  [PH]  Adm Details
 *   130   2566…    660    …               BCD  F   …    NS-OPEN-FEM-P1
 * RANK is the NEET PG All India Rank. "Adm Details" encodes the seat: service (NS/IS) - seat category - general/female
 * [- extra] - phase (P1, P2, …), or MQ1/MQ2 (management / NRI) - UNR - phase. Later phases re-list candidates who
 * kept an earlier seat; only rows allotted in the current phase are kept. Names are skipped and never written.
 *
 * Usage: tsx pipeline/states/telangana.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { pageLines } from '../textlines';

const RAW = 'data/raw/states/telangana';
const BASE = 'https://www.knruhs.telangana.gov.in/wp-content/uploads/notifications/';
const P = (s: string) => BASE + encodeURIComponent(s).replace(/%2F/g, '/');
const CQ = 'KNRUHS - MEDICAL PG DEGREE DIPLOMA ADMISSIONS UNDER COMPETENT AUTHORITY QUOTA FOR THE AY 2025-26 - ';
const MQ = 'KNRUHS - MEDICAL PG DEGREE DIPLOMA ADMISSIONS UNDER MANAGEMENT QUOTA FOR THE AY 2025-26 - ';
// [round file, label, [source file, quota group, official file name]...]
const ROUNDS: [string, string, [string, string, string][]][] = [
  ['tg2025_r1', 'Round 1', [['tg2025_cq_r1', 'CQ', '20251214101208College_Wise_P1.pdf'], ['tg2025_mq_r1', 'MQ', `20260119121653${MQ}PHASE 1 ALLOTMENTS.pdf`]]],
  ['tg2025_r2', 'Round 2', [['tg2025_cq_r2', 'CQ', `20251227103511${CQ}COLLEGE WISE ALLOTMENTS IN SECOND PHASE OF COUNSELLING.pdf`], ['tg2025_mq_r2', 'MQ', `20260127112050${MQ}COLLEGE WISE ALLOTMENTS IN SECOND PHASE OF COUNSELLING.pdf`]]],
  ['tg2025_r3', 'Round 3', [['tg2025_cq_r3', 'CQ', `20260217051913${CQ}COLLEGE WISE ALLOTMENT LIST IN MOP-UP PHASE OF COUNSELLING.pdf`], ['tg2025_cq_r3ins', 'CQ', ''], ['tg2025_mq_r3', 'MQ', `20260217203157${MQ}COLLEGE WISE REVISED ALLOTMENTS IN MOP UP PHASE OF COUNSELLING.pdf`]]],
  ['tg2025_r4', 'Additional mop-up', [['tg2025_cq_r4', 'CQ', ''], ['tg2025_mq_r4', 'MQ', '']]],
  ['tg2025_stray', 'Stray', [['tg2025_cq_stray', 'CQ', ''], ['tg2025_mq_stray', 'MQ', `20260228112314${MQ}COLLEGE WISE ALLOTMENTS IN STRAY VACANCY PHASE OF COUNSELLING.pdf`]]],
  // 2024-25 (KNRUHS admission notifications, Jan–Mar 2025). Phases: CQ P1, P2, P3 (service, mop-up), P4 (mop-up), P5 (additional
  // mop-up), P6 (stray), P7 (special stray), P8 (final stray); MQ P1–P6.
  ['tg2024_r1', 'Round 1', [['tg2024_cq_r1', 'CQ', '20250101151859College_Wise_P1.pdf'], ['tg2024_mq_r1', 'MQ', '20250106123929PG MQ College_Wise_P1 (4).pdf']]],
  ['tg2024_r2', 'Round 2', [['tg2024_cq_r2', 'CQ', '20250109085836PG CQ College_Wise_P2 (6).pdf'], ['tg2024_mq_r2', 'MQ', '20250121063829PG MQ - college_Wise_P2 (7).pdf']]],
  ['tg2024_r3', 'Round 3', [['tg2024_cq_r3', 'CQ', '20250210054453College_Wise_P4_Revised.pdf'], ['tg2024_cq_r3ins', 'CQ', '20250128113755College_Wise_P3_service_Revised (1).pdf'], ['tg2024_mq_r3', 'MQ', '20250217103403College_Wise_P3_with_MQ3_Final.pdf']]],
  ['tg2024_r4', 'Additional mop-up', [['tg2024_cq_r4', 'CQ', '20250215120118College_Wise_P5_c.pdf']]],
  ['tg2024_stray', 'Stray', [['tg2024_cq_stray', 'CQ', '20250225052951PG CQ - College_Wise_P6_STRAY VACANCY PHASE.pdf'], ['tg2024_mq_stray', 'MQ', '20250225103014College_Wise_P4_with_MQ3.pdf']]],
  ['tg2024_sstray', 'Special stray', [['tg2024_cq_sstray', 'CQ', '20250315053801College_Wise_P7_with_remarks.pdf'], ['tg2024_mq_sstray', 'MQ', '20250315112646PG MQ - College_Wise_P5_with_MQ3.pdf']]],
  ['tg2024_sstray2', 'Special stray 2', [['tg2024_cq_sstray2', 'CQ', '20250320064255PG CQ College_Wise_P8.pdf'], ['tg2024_mq_sstray2', 'MQ', '20250320064321PG MQ College_Wise_P6.pdf']]],
];

const tags = new Map<string, number>(), phases = new Map<string, number>();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
for (const [out, label, sources] of ROUNDS) {
  const rows: any[] = [];
  const perFile: string[] = [];
  for (const [file, group, official] of sources) {
    const raw: { page: number; rank: number; college: string; collegeCode: string; course: string; courseCode: string; cat: string; adm: string }[] = [];
    let college = '', collegeCode = '', course = '', courseCode = '', catX = 0;
    for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) {
      for (const line of pageLines(pg)) {
        const w = line.words, t = w.map((x) => x.text).join(' ');
        let m = t.match(/^COLL\s*::\s*([A-Z0-9&.]+)\((\d+)\)\s*-\s*(.*)$/);
        if (m) { collegeCode = `${m[1]}(${m[2]})`; college = m[3].trim(); continue; }
        m = t.match(/^CRS\s*::\s*([A-Z0-9&.]+)\s*\((\d+)\)\s*-\s*(.*)$/);
        if (m) { courseCode = m[1]; course = m[3].trim(); continue; }
        if (/^RANK\s+ROLL/.test(t)) { catX = w.find((x) => x.text === 'CAT')?.x0 ?? 0; continue; }
        if (!/^\d+$/.test(w[0]?.text ?? '') || !/^\d{11}$/.test(w[1]?.text ?? '')) continue;
        const adm = [...w].reverse().find((x) => /^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(x.text))?.text ?? '';
        const cat = w.find((x) => Math.abs(x.x0 - catX) < 10)?.text ?? '';
        raw.push({ page: pg.index + 1, rank: Number(w[0].text), college, collegeCode, course, courseCode, cat, adm });
      }
    }
    const phaseOf = (adm: string) => adm.match(/-(P\d+|[A-Z]*MOP[A-Z0-9]*|STRAY|SV\d*|AMU\d*)$/i)?.[1] ?? adm.split('-').pop() ?? '';
    const counts = new Map<string, number>();
    for (const r of raw) bump(counts, phaseOf(r.adm));
    // each list re-prints earlier phases' seats; the newest phase (highest P-number) is what this list allotted
    const current = [...counts.keys()].sort((a, b) => Number(b.replace(/\D/g, '')) - Number(a.replace(/\D/g, '')))[0] ?? '';
    let kept = 0;
    for (const r of raw) {
      bump(phases, `${file}:${phaseOf(r.adm)}`);
      if (phaseOf(r.adm) !== current) continue; // held over from an earlier phase
      bump(tags, r.adm.split('-').slice(0, -1).join('-'));
      rows.push({ rank: r.rank, quota: group, institute: r.college, collegeCode: r.collegeCode, course: r.course, courseCode: r.courseCode,
        allottedCategory: r.adm, candidateCategory: r.cat, remarks: '', page: r.page, file });
      kept++;
    }
    perFile.push(`${file} ${kept}/${raw.length} (phase ${current})`);
    if (!official) console.log(`  note: official file name for ${file} not recorded`);
  }
  rows.sort((a, b) => a.rank - b.rank);
  const url = P(sources[0][2] || sources.find((s) => s[2])?.[2] || '');
  writeFileSync(`data/parsed/${out}.json`, JSON.stringify({ source: url, url, counselling: 'Telangana', year: Number(out.slice(2, 6)), round: label, rows }));
  console.log(`${out}: ${rows.length} allotments — ${perFile.join(', ')}`);
}
console.log('phase tags', Object.fromEntries(phases));
console.log('seat tags', Object.fromEntries([...tags].sort((a, b) => b[1] - a[1])));
