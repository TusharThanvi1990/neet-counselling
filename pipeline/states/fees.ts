/**
 * State counselling tuition fees (yearly) per college × course × seat type → data/parsed/fees_<state><year>.json.
 *
 * Gujarat (ACPPGMEC fee structure 2025, data/raw/states/gujarat/gj2025_fees.pdf): one page per college, header
 *   "Branch | <college name>" then  course | TUTION FEE GQ | TUTION FEE MQ | TUTION FEE NQ  ("-" = no such seat).
 *   Pages are in a fixed order; the college codes below match the codes in the allotment lists.
 * Karnataka fees come straight from the KEA allotment rows (each row prints the seat's fee), so they need no file here.
 *
 * Usage: tsx pipeline/states/fees.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const GJ_PAGES = ['AMED', 'BMED', 'SMED', 'RMED', 'JMED', 'BHMED', 'BHUMED', 'CUMED', 'GCSMED', 'GOTMED', 'KMED', 'NAMOMED', 'NHL', 'SMC', 'SOLMED',
  'GMED', 'PATMED', 'VALMED', 'HIMMED', 'JUMED', 'PRMED', 'MKMED', 'IKDMED', 'VADMED', 'AMRMED', 'NDMED', 'VISMED', 'ANAMED', 'SWAMED', 'KIRMED', 'ZYMED'];
const num = (s: string) => { const n = Number((s ?? '').replace(/[^\d]/g, '')); return n > 0 ? n : null; };

const out: any[] = [];
let page = -1;
for await (const pg of readPages(new Uint8Array(readFileSync('data/raw/states/gujarat/gj2025_fees.pdf')))) {
  for (const c of gridTable(pg).rows) {
    if (c[0] === 'Branch') { page++; continue; }
    if (page < 0 || /TUTION|^$/.test(c[0] ?? '') || c.length < 4) continue;
    const code = GJ_PAGES[page];
    if (!code) throw new Error(`unexpected fee page ${page + 1}`);
    out.push({ collegeCode: code, course: c[0].trim(), GQ: num(c[1]), MQ: num(c[2]), NQ: num(c[3]) });
  }
}
if (page + 1 !== GJ_PAGES.length) throw new Error(`expected ${GJ_PAGES.length} college pages, found ${page + 1}`);
writeFileSync('data/parsed/fees_gj2025.json', JSON.stringify({ source: 'https://www.medadmgujarat.org/pgmed/', state: 'Gujarat', year: 2025, rows: out }));
console.log(`fees_gj2025: ${out.length} course rows for ${page + 1} colleges; courses: ${[...new Set(out.map((r) => r.course))].slice(0, 60).join(' | ')}`);

/**
 * Telangana: G.O.Ms.No.107, HM&FW (C1), 28-07-2023 (block period 2023-26), Annexure-I, private unaided colleges
 * (data/raw/states/telangana/tg2023_26_go107_fees.pdf, a scan; read by OCR and every row checked against the page image).
 * Yearly tuition per course group: [clinical A, clinical B, para-clinical A, para-clinical B, non-clinical A, non-clinical B].
 * Category C (NRI / institutional) is only capped at "up to 3 times Category B", so it is not recorded.
 * Keys are the KNRUHS college codes used in the allotment lists. Malla Reddy Institute / Malla Reddy for Women are in the
 * order but have no 2025 allotments; Ayaan, CMR, Neelima, Surabhi, TRR and Mamata Academy are not in the order.
 */
const TG: Record<string, [string, number[]]> = {
  'APLO(063)': ['Apollo Institute of Medical Sciences & Research', [750000, 2300000, 430000, 530000, 170000, 170000]],
  'BASK(057)': ['Bhaskar Medical College', [750000, 2300000, 430000, 530000, 170000, 170000]],
  'CARK(052)': ['Chalmeda Anandarao Institute of Medical Sciences', [775000, 2400000, 430000, 530000, 200000, 200000]],
  'DCMS(061)': ['Deccan College of Medical Sciences', [775000, 2400000, 430000, 530000, 216000, 216000]],
  'DPMR(069)': ['Dr Patnam Mahender Reddy Institute of Medical Sciences', [700000, 2300000, 430000, 530000, 170000, 170000]],
  'VRKW(067)': ['Dr VRK Womens Medical College', [700000, 2300000, 430000, 530000, 170000, 170000]],
  'KMHD(059)': ['Kamineni Academy of Medical Sciences & Research Center', [700000, 2300000, 430000, 545000, 216000, 216000]],
  'KMNI(056)': ['Kamineni Institute of Medical Sciences', [750000, 2300000, 430000, 545000, 216000, 216000]],
  'MMTA(051)': ['Mamata Medical College', [750000, 2300000, 430000, 660000, 170000, 170000]],
  'MHVR(066)': ['Mahavir Institute of Medical Sciences', [700000, 2300000, 430000, 530000, 170000, 170000]],
  'MAHE(068)': ['Maheswara Medical College', [700000, 2300000, 430000, 530000, 170000, 170000]],
  'MEDI(058)': ['Mediciti Institute of Medical Sciences', [700000, 2300000, 430000, 530000, 170000, 170000]],
  'MNRS(055)': ['MNR Medical College & Hospital', [700000, 2300000, 446500, 562250, 189000, 189000]],
  'PRTM(053)': ['Prathima Institute of Medical Sciences', [750000, 2300000, 462250, 562250, 187000, 187000]],
  'RVMC(064)': ['RVM Medical College of Medical Sciences Research Centre', [700000, 2300000, 430000, 530000, 170000, 170000]],
  'SVSM(054)': ['SVS Medical College', [750000, 2400000, 460000, 750000, 180000, 180000]],
  'SHDN(060)': ['Shadan Institute of Medical Sciences', [750000, 2400000, 430000, 530000, 200000, 200000]],
};
writeFileSync('data/parsed/fees_tg2023.json', JSON.stringify({
  source: 'https://medicaldialogues.in/pdf_upload/20230816122639107108-1-219079.pdf', order: 'G.O.Ms.No.107, HM&FW (C1), 28-07-2023 (2023-26)', state: 'Telangana', year: 2025,
  rows: Object.entries(TG).map(([collegeCode, [name, f]]) => ({ collegeCode, name, clinical: [f[0], f[1]], para: [f[2], f[3]], nonClinical: [f[4], f[5]] })),
}));
console.log(`fees_tg2023: ${Object.keys(TG).length} colleges`);

/**
 * Andhra Pradesh private unaided colleges, same fee in every college, by course group:
 *  Category A (competent authority): NTRUHS 2024-25 competent-authority notification (data/raw/states/andhra/ap2024_ca_notice_fees.pdf).
 *  Category B (management) and C (NRI / institutional): NTRUHS 2025-26 management-quota notification, G.O.Rt.No.777 dt 09-11-2025
 *  (data/raw/states/andhra/ap2025_mq_notice_fees.pdf), which repeats the 2024-25 amounts.
 */
writeFileSync('data/parsed/fees_ap2025.json', JSON.stringify({
  state: 'Andhra Pradesh', year: 2025,
  sources: { A: 'https://apuhs-pgadmissions.aptonline.in/pgmedcq/Home/Bulletinopen?RowId=80', BC: 'https://medicaldialogues.in/pdf_upload/20251118151241753-309511.pdf' },
  categories: { A: { clinical: 496800, para: 155250, pre: 70380 }, B: { clinical: 993600, para: 310500, pre: 140760 }, C: { clinical: 5750000, para: 1725000, pre: 920000 } },
}));
console.log('fees_ap2025: category table written');

/**
 * Per-college fee orders in one shared format (data/parsed/fees_college_<state>.json), read by build-dataset.ts:
 *   colleges: { inst: institute key as built in build-dataset (e.g. "WB GOURIDEVI"), fees: { quota kind: [clinical, para, pre] } }
 *   quotas: quota kind → regex on the site's quota label (state prefix removed).
 * Course groups: pre-clinical = Anatomy / Physiology / Biochemistry; para-clinical = Pathology, Microbiology, Pharmacology,
 * Forensic Medicine, Community Medicine, Transfusion, Lab Medicine; clinical = the rest. "Non-clinical" in an order = pre + para.
 */
type CollegeFees = { inst: string; name: string; fees: Record<string, [number, number, number]> };
const college = (file: string, d: { state: string; year: number; source: string; label: string; quotas: Record<string, string>; colleges: CollegeFees[] }) => {
  writeFileSync(`data/parsed/fees_college_${file}.json`, JSON.stringify(d));
  console.log(`fees_college_${file}: ${d.colleges.length} colleges`);
};
const L = 100000;
// West Bengal: Memo No. HFW-23099/230/2025/M/SS(ME)/SPL./110/2025 dt 03.12.2025, fees approved by the Permanent Fee
// Fixation Committee (data/raw/states/westbengal/wb2025_fees_private.pdf, a scan; read against the page image).
// "Non-clinical" applies to pre- and para-clinical subjects. RKM Seva Pratishthan and JIS are not in the memo.
const wbAll = (sq: number, mq: number): Record<string, [number, number, number]> => ({ state: [sq, sq, sq], mgmt: [mq, mq, mq] });
college('wb2025', {
  state: 'West Bengal', year: 2025, label: 'West Bengal Permanent Fee Fixation Committee (memo 03.12.2025)',
  source: 'https://cdnbbsr.s3waas.gov.in/s3aae8d1e00b15a30e5901227e97ffbef7/uploads/2025/12/20251203260479.pdf',
  quotas: { state: '^Private \\(state quota\\)$', mgmt: '^Management$' },
  colleges: [
    { inst: 'WB GOURIDEVI', name: 'Gouridevi Medical College, Durgapur', fees: wbAll(9 * L, 27 * L) },
    { inst: 'WB SHRRAMKRISHNA', name: 'Shri Ramkrishna Institute of Medical Sciences & Sanaka Hospital, Durgapur', fees: wbAll(9 * L, 27 * L) },
    { inst: 'WB IQCITY', name: 'IQ City Medical College', fees: { state: [9 * L, 2.16 * L, 2.16 * L], mgmt: [27 * L, 6.4 * L, 6.4 * L] } },
    { inst: 'WB KPCMEDICAL', name: 'KPC Medical College, Jadavpur', fees: wbAll(8.5 * L, 27 * L) },
    { inst: 'WB ICAREINSTITUTE', name: 'ICARE Institute of Medical Science and Research, Haldia', fees: { state: [9 * L, 3.9 * L, 3.9 * L], mgmt: [27 * L, 15.5 * L, 15.5 * L] } },
    { inst: 'WB JAGANNATHGUPTA', name: 'Jagannath Gupta Institute of Medical Sciences and Hospital', fees: wbAll(9 * L, 27 * L) },
  ],
});
