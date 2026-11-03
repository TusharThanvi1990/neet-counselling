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
// fees: by course group; courseFees: by subject name (matched to the start of the site's branch label, e.g. "General Medicine").
type CollegeFees = { inst: string; name: string; fees?: Record<string, [number, number, number]>; courseFees?: Record<string, Record<string, number>> };
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

// Himachal Pradesh: AMRU PG MD/MS/DNB Prospectus 2026 (amruhp.ac.in, 22-10-2026), chapter 8. Government colleges: tuition
// ₹24,000 per year (8.2.1). Maharishi Markandeshwar, Kumarhatti: tuition incl. other charges per subject (8.3); NRI in US$, not recorded.
const hpGovt = (inst: string, name: string): CollegeFees => ({ inst, name, fees: { all: [24000, 24000, 24000] } });
college('hp2026', {
  state: 'Himachal Pradesh', year: 2026, label: 'AMRU PG prospectus 2026 (fees, chapter 8)',
  source: 'https://amruhp.ac.in/wp-content/uploads/2026/10/Final-Merged-PG-MD-MS-DNB-Prospectus-2026-22-10-2026.pdf',
  quotas: { all: '^(State Quota|In-service \\(incentive marks\\)|Management)$' },
  colleges: [
    hpGovt('HP indiragandhimedicalcollegeshimla', 'Indira Gandhi Medical College, Shimla'),
    hpGovt('HP rajendraprasad', 'Dr Rajendra Prasad Government Medical College, Tanda'),
    hpGovt('HP lalbahadurshastri', 'Shri Lal Bahadur Shastri Government Medical College, Ner Chowk'),
    hpGovt('HP radhakrishanan', 'Dr Radhakrishnan Government Medical College, Hamirpur'),
    hpGovt('HP yashwantparmar', 'Dr Yashwant Singh Parmar Government Medical College, Nahan'),
    hpGovt('HP jawaharlalnehru', 'Pt Jawahar Lal Nehru Government Medical College, Chamba'),
    { inst: 'HP maharishimarkandeshwar', name: 'Maharishi Markandeshwar Medical College & Hospital, Kumarhatti', courseFees: { all: {
      Anatomy: 300000, Physiology: 300000, Biochemistry: 300000, 'Community Medicine': 350000, Microbiology: 300000, Pathology: 1595000,
      Pharmacology: 300000, 'Respiratory Medicine': 2347800, ENT: 1931600, Ophthalmology: 2767800, Paediatrics: 2767800,
      'Obstetrics & Gynaecology': 2935800, Anaesthesiology: 1931600, Psychiatry: 2347800, 'General Surgery': 2635600,
      'General Medicine': 2899600, Radiodiagnosis: 3339600, Dermatology: 3187800, Orthopaedics: 2767800, 'Forensic Medicine': 350000 } } },
  ],
});

// Bihar: each private college's PGMAC-2025 fee letter to BCECEB (bceceboard.bihar.gov.in/pdf_Web/PGMAC25_FSTR.pdf, scans,
// transcribed from the page images). Yearly tuition for general / minority seats; NRI fees are in US dollars and not recorded.
const bh = (o: Record<string, number>) => ({ gen: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v * L])) });
college('bh2025', {
  state: 'Bihar', year: 2025, label: 'BCECEB PGMAC-2025 college fee letters',
  source: 'https://bceceboard.bihar.gov.in/pdf_Web/PGMAC25_FSTR.pdf',
  quotas: { gen: '^(Private \\(state quota\\)|Minority)$' },
  colleges: [
    { inst: 'BH KMCKATIHAR', name: 'Katihar Medical College', courseFees: bh({ 'General Medicine': 34.5, Paediatrics: 45, Orthopaedics: 45, 'Obstetrics & Gynaecology': 60, Anaesthesiology: 18, Dermatology: 45, 'General Surgery': 34.5, Radiodiagnosis: 60, Psychiatry: 22.65, ENT: 16.5, Ophthalmology: 22.5, Pathology: 7.5, 'Community Medicine': 7.5, Pharmacology: 2.5, Microbiology: 3.75, Biochemistry: 2.5, Physiology: 2.5, Anatomy: 2.5, 'Respiratory Medicine': 34.5 }) },
    { inst: 'BH NMCHSASARAM', name: 'Narayan Medical College & Hospital, Sasaram', courseFees: bh({ 'General Medicine': 38, Paediatrics: 42.5, Orthopaedics: 42.5, 'Obstetrics & Gynaecology': 50, Anaesthesiology: 19.5, Dermatology: 49.5, 'General Surgery': 32.5, Radiodiagnosis: 55, ENT: 19.5, Ophthalmology: 19.5, Pathology: 12, Pharmacology: 2, Microbiology: 2.5, Biochemistry: 2, Physiology: 2, Anatomy: 2 }) },
    { inst: 'BH MGMMCLSKHOSKISHANGANJ', name: 'Mata Gujri Memorial Medical College, Kishanganj', courseFees: bh({ Radiodiagnosis: 50, 'Obstetrics & Gynaecology': 50, 'General Medicine': 34.5, 'General Surgery': 32, Dermatology: 45, Orthopaedics: 40, Paediatrics: 40, Anaesthesiology: 18, Ophthalmology: 19, ENT: 15, Pathology: 7.5, Microbiology: 5, Pharmacology: 2, 'Community Medicine': 5, Anatomy: 2, Physiology: 2, Biochemistry: 2.5 }) },
    { inst: 'BH RDJMMEDICALCOLLEGEANDHOSPITALTURKIMUZAFFARPUR', name: 'RDJM Medical College & Hospital, Turki', courseFees: bh({ Anatomy: 3, Physiology: 3, Orthopaedics: 40, Anaesthesiology: 19, 'Obstetrics & Gynaecology': 39, Ophthalmology: 22, ENT: 18, Pharmacology: 2.5, Microbiology: 3, Biochemistry: 2.5, Pathology: 12 }) },
    { inst: 'BH LORDBUDHAKOSHIMEDICALCOLLEGEHOSPITALSAHARSA', name: 'Lord Buddha Koshi Medical College & Hospital, Saharsa', courseFees: bh({ 'General Medicine': 25.5, Paediatrics: 25.5, 'General Surgery': 17.5, Orthopaedics: 21.5, 'Obstetrics & Gynaecology': 33, Anaesthesiology: 11, Pathology: 9.8, Radiodiagnosis: 44, ENT: 15, Ophthalmology: 20, Physiology: 5, Biochemistry: 5, Pharmacology: 5, 'Respiratory Medicine': 35 }) },
    { inst: 'BH SHRINARAYANMEDICALINSTITUTEANDHOSPITALSAHARSA', name: 'Shree Narayan Medical Institute & Hospital, Saharsa', courseFees: bh({ 'Obstetrics & Gynaecology': 38.5, 'General Medicine': 28, Paediatrics: 35.75, Orthopaedics: 37, 'General Surgery': 25, Anaesthesiology: 15, Pathology: 10, Radiodiagnosis: 47, Dermatology: 42, Ophthalmology: 21 }) },
    { inst: 'BH MADHUBANIMEDICALCOLLEGEMADHUBANI', name: 'Madhubani Medical College', courseFees: bh({ 'General Medicine': 30, Paediatrics: 36, Anaesthesiology: 20, Dermatology: 40, Pathology: 10, 'General Surgery': 30, 'Obstetrics & Gynaecology': 40, Orthopaedics: 35, Ophthalmology: 20, ENT: 15, Radiodiagnosis: 55, Anatomy: 2.5, Physiology: 2, Biochemistry: 2.5, Pharmacology: 2.5, Microbiology: 4, 'Community Medicine': 6 }) },
    { inst: 'BH NETAJISUBHASMEDICALCOLLEGEHOSPITAL', name: 'Netaji Subhas Medical College & Hospital, Bihta', courseFees: bh({ Anatomy: 4, Physiology: 4, Biochemistry: 4, Pathology: 8, Pharmacology: 4, Microbiology: 4, 'General Medicine': 31.5, Paediatrics: 33.5, Anaesthesiology: 19.25, 'Obstetrics & Gynaecology': 38.5, 'General Surgery': 29.25, Radiodiagnosis: 44.5, Ophthalmology: 20.5, Psychiatry: 23, Orthopaedics: 43.5, ENT: 20, Dermatology: 44 }) },
  ],
});
