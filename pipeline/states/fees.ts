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

// Rajasthan private colleges: "College fee details for NEET PG admissions 2025 (as provided by the respective medical college)",
// Rajasthan NEET PG Board (data/raw/states/rajasthan/rj2025_fees_pvt.pdf; text layer is garbled, transcribed from page images).
// Yearly tuition as printed: AI & state-nature seats, and management seats; 0 / blank = not offered and not recorded.
// Ananta: one row has no subject label and is left out.
const rj = (o: Record<string, [number, number]>) => ({
  state: Object.fromEntries(Object.entries(o).filter(([, v]) => v[0]).map(([k, v]) => [k, v[0]])),
  mgmt: Object.fromEntries(Object.entries(o).filter(([, v]) => v[1]).map(([k, v]) => [k, v[1]])),
});
college('rj2025', {
  state: 'Rajasthan', year: 2025, label: 'Rajasthan NEET PG 2025 college fee details',
  source: 'https://rajpgneet2025.in/',
  quotas: { state: '^(Private \\(open to all\\)|State Quota)$', mgmt: '^Management$' },
  colleges: [
    { inst: 'RJ americaninternationalinstituteofmedicalsciences', name: 'American International Institute of Medical Sciences, Udaipur', courseFees: rj({
      Anaesthesiology: [2800000, 0], 'General Medicine': [3255000, 8500000], Paediatrics: [3255000, 7500000], Pathology: [1200000, 0], 'Community Medicine': [300000, 0],
      Psychiatry: [3255000, 0], Radiodiagnosis: [3255000, 12000000], 'Respiratory Medicine': [3255000, 0], Dermatology: [3255000, 11000000], ENT: [3255000, 0],
      'General Surgery': [3255000, 5500000], 'Obstetrics & Gynaecology': [3255000, 8000000], Ophthalmology: [3255000, 0], Orthopaedics: [3255000, 7500000] }) },
    { inst: 'RJ anantainstituteofmedicalsciencesandresearchcentrerajsamand', name: 'Ananta Institute of Medical Sciences and Research Centre, Rajsamand', courseFees: rj({
      Anaesthesiology: [2500000, 3255000], 'Forensic Medicine': [300000, 0], 'General Medicine': [3255000, 9000000], Pathology: [1200000, 0], 'Community Medicine': [300000, 0],
      Psychiatry: [3255000, 0], Radiodiagnosis: [3255000, 11000000], 'Respiratory Medicine': [3255000, 0], Dermatology: [3255000, 11000000], ENT: [3255000, 0],
      'General Surgery': [3255000, 5500000], 'Obstetrics & Gynaecology': [3255000, 8500000], Ophthalmology: [3255000, 0], Orthopaedics: [3255000, 7000000] }) },
    { inst: 'RJ geetanjalimedicalcollegehospitaludaipur', name: 'Geetanjali Medical College & Hospital, Udaipur', courseFees: rj({
      Anaesthesiology: [2500000, 3125000], Anatomy: [700000, 700000], Biochemistry: [700000, 700000], 'Emergency Medicine': [4500000, 5625000], 'Forensic Medicine': [700000, 700000],
      'General Medicine': [7500000, 9375000], Microbiology: [700000, 700000], Paediatrics: [6500000, 8125000], Pathology: [1500000, 1875000], Pharmacology: [700000, 700000],
      Physiology: [700000, 700000], 'Community Medicine': [700000, 700000], Psychiatry: [4800000, 6000000], Radiodiagnosis: [10000000, 12500000], 'Radiation Oncology': [4500000, 5625000],
      'Respiratory Medicine': [5500000, 6875000], Dermatology: [9500000, 11875000], ENT: [4500000, 5625000], 'General Surgery': [5500000, 6875000],
      'Obstetrics & Gynaecology': [7500000, 9375000], Ophthalmology: [5500000, 6875000], Orthopaedics: [7000000, 8750000] }) },
    { inst: 'RJ mahatmagandhimedicalcollegeandhospitaljaipur', name: 'Mahatma Gandhi Medical College and Hospital, Jaipur', courseFees: rj({
      Anaesthesiology: [2100000, 5875000], Biochemistry: [600000, 0], 'Emergency Medicine': [3150000, 5875000], 'Family Medicine': [1875000, 0], 'Forensic Medicine': [600000, 0],
      'General Medicine': [5075000, 6825000], 'Immunohaematology & Transfusion': [950000, 0], 'Laboratory Medicine': [1000000, 0], Microbiology: [600000, 0],
      'Nuclear Medicine': [2835000, 5875000], Paediatrics: [5075000, 6300000], 'Palliative Medicine': [1575000, 0], Pathology: [1575000, 0], 'Physical Medicine & Rehab': [1200000, 0],
      'Community Medicine': [600000, 0], Psychiatry: [4200000, 6175000], Radiodiagnosis: [6300000, 7600000], 'Radiation Oncology': [2625000, 5875000], 'Respiratory Medicine': [4200000, 5875000],
      Dermatology: [6300000, 7875000], ENT: [2625000, 5875000], 'General Surgery': [4725000, 6175000], 'Obstetrics & Gynaecology': [5075000, 7175000], Ophthalmology: [4975000, 5875000],
      Orthopaedics: [5075000, 6550000], 'Traumatology & Surgery': [4500000, 0] }) },
    { inst: 'RJ pacificinstituteofmedicalsciencesumardaudaipur', name: 'Pacific Institute of Medical Sciences, Umarda, Udaipur', courseFees: rj({
      Anaesthesiology: [3500000, 6000000], Anatomy: [500000, 0], Biochemistry: [500000, 0], 'Emergency Medicine': [3500000, 0], 'Forensic Medicine': [500000, 0],
      'General Medicine': [10000000, 13000000], Microbiology: [500000, 0], Paediatrics: [8500000, 11000000], Pathology: [2500000, 0], Pharmacology: [500000, 0], Physiology: [500000, 0],
      'Community Medicine': [500000, 0], Psychiatry: [6000000, 0], Radiodiagnosis: [12500000, 15000000], 'Respiratory Medicine': [7500000, 10500000], Dermatology: [11500000, 14000000],
      ENT: [5000000, 0], 'General Surgery': [6500000, 10000000], 'Obstetrics & Gynaecology': [11000000, 13000000], Ophthalmology: [7000000, 11000000], Orthopaedics: [7500000, 10500000] }) },
    { inst: 'RJ pacificmedicalcollegehospitaludaipur', name: 'Pacific Medical College & Hospital, Udaipur', courseFees: rj({
      Anaesthesiology: [4000000, 6000000], Anatomy: [200000, 200000], Biochemistry: [200000, 200000], 'Emergency Medicine': [5500000, 7500000], 'Forensic Medicine': [250000, 250000],
      'General Medicine': [9500000, 13000000], Microbiology: [600000, 600000], Paediatrics: [8000000, 11500000], Pathology: [2250000, 2250000], Pharmacology: [200000, 200000],
      Physiology: [250000, 250000], 'Community Medicine': [250000, 250000], Psychiatry: [6000000, 8000000], Radiodiagnosis: [12000000, 15000000], 'Respiratory Medicine': [7000000, 9500000],
      Dermatology: [11000000, 13000000], ENT: [5500000, 9000000], 'General Surgery': [6000000, 8500000], 'Obstetrics & Gynaecology': [11000000, 13750000], Ophthalmology: [6000000, 8000000],
      Orthopaedics: [7500000, 9500000] }) },
  ],
});

// Uttar Pradesh private non-minority colleges: Govt of UP notification 1/1036663/2025/71-4005(002)/7/2025 dt 24-07-2025,
// Annexure-2 "MD/MS fees for session 2025-26" (scan; Medical Dialogues copy of the official PDF, transcribed from the images):
// [clinical, pathology, non-clinical] per year; 0 = "आवश्यकता नहीं" (not required). Six gaps are filled from the later DGME
// notice for six colleges (GS Hapur, KD Mathura, Narayana Kanpur, Saraswati Unnao, SKS Mathura, United Prayagraj), as
// reported by Medical Dialogues (article 165137). Non-clinical = pre- and para-clinical subjects other than Pathology.
const up = (clin: number, path: number, non: number): Pick<CollegeFees, 'fees' | 'courseFees'> => ({
  fees: { pvt: [clin, non, non] }, ...(path ? { courseFees: { pvt: { Pathology: path } } } : {}),
});
college('up2025', {
  state: 'Uttar Pradesh', year: 2025, label: 'Govt of UP MD/MS fee notification 24-07-2025 (Annexure-2)',
  source: 'https://medicaldialogues.in/pdf_upload/docscanner-24-jul-2025-20-59-1-296823.pdf',
  quotas: { pvt: '^Private \\(state quota\\)$' },
  colleges: ([
    ['UP gsmedicalcollegehapur', 'GS Medical College & Hospital, Hapur', up(3116082, 1368036, 1026562)],
    ['UP saraswatiinstituteofmedicalscienceshapur', 'Saraswati Institute of Medical Sciences, Hapur', up(2022143, 1088846, 845377)],
    ['UP schoolofmedicalsciencesresearchshardauniversitygnoida', 'School of Medical Sciences & Research (Sharda University), Greater Noida', up(2540649, 1368025, 977116)],
    ['UP noidainternationalinstituteofmedicalsciencesgreaternoida', 'Noida International Institute of Medical Sciences', up(2508698, 1368036, 0)],
    ['UP heritagemedicalcollegevaranasi', 'Heritage Institute of Medical Sciences, Varanasi', up(3042024, 1638013, 1203094)],
    ['UP unitedmedicalcollegeprayagraj', 'United Institute of Medical Sciences, Prayagraj', up(2508698, 1723022, 1259770)],
    ['UP mayoinstituteofmedicalsciencebarabanki', 'Mayo Institute of Medical Sciences, Barabanki', up(2030961, 1093571, 818235)],
    ['UP tsmishramedicalcollegehospitallucknow', 'T.S. Mishra Medical College & Hospital, Lucknow', up(3116082, 1600848, 1152000)],
    ['UP kdmedicalcollegemathura', 'Kanti Devi (K.D.) Medical College, Mathura', up(2163946, 1202199, 1026562)],
    ['UP kmmedicalcollegemathura', 'Krishna Mohan (K.M.) Medical College, Mathura', up(2163946, 1196543, 0)],
    ['UP ramamedicalcollegekanpur', 'Rama Medical College, Kanpur', up(3074916, 1781315, 1272368)],
    ['UP ramamedicalcollegehospitalresearchcentrehapur', 'Rama Medical College, Hapur', up(2970734, 0, 0)],
    ['UP shrirammurtimedicalsciencesbarilly', 'Shri Ram Murti Smarak Institute of Medical Sciences, Bareilly', up(2509957, 1351477, 965384)],
    ['UP subharatimedicalcollegemeerut', 'Subharti Medical College, Meerut', up(1443744, 1080000, 864000)],
    ['UP hindmedicalcollegebarabanki', 'Hind Institute of Medical Sciences, Barabanki', up(2524901, 1359562, 971116)],
    ['UP muzaffarnagarmedicalcollegemuzaffarnagar', 'Muzaffarnagar Medical College', up(2323197, 1250889, 893521)],
    ['UP rohilkhandmedicalcollegebareilly', 'Rohilkhand Medical College & Hospital, Bareilly', up(2309009, 1243216, 888056)],
    ['UP hindmedicalcollegesitapur', 'Hind Institute of Medical Sciences, Sitapur', up(2449140, 1318768, 984431)],
    ['UP rajshreemedicalresearchinstitutebareilly', 'Rajshree Medical Research Institute, Bareilly', up(2987856, 1608912, 1152000)],
    ['UP prasadmedicalcollegelucknow', 'Prasad Institute of Medical Sciences, Lucknow', up(2163946, 0, 0)],
    ['UP nationalcapitalmedicalcollegemeerut', 'National Capital Region Institute of Medical Sciences, Meerut', up(2759749, 1442639, 1056223)],
    ['UP varunarjunmedicalcollegeshahajanpur', 'Varun Arjun Medical College, Shahjahanpur', up(2805739, 1442639, 1122295)],
    ['UP venkateshwaramedicalcollegeamroha', 'Venkateshwara Institute of Medical Sciences, Gajraula', up(2163946, 1202199, 0)],
    ['UP narainameicalcollegeresearchcentrekanpur', 'Narayana Medical College, Kanpur', up(0, 0, 1026562)],
    ['UP saraswatimedicalcollegeunnao', 'Saraswati Medical College, Unnao', up(0, 1368036, 0)],
    ['UP skshospitalmedicalcollegeresearchcentermathura', 'SKS Hospital Medical College, Mathura', up(2508698, 0, 1026562)],
  ] as [string, string, Pick<CollegeFees, 'fees' | 'courseFees'>][]).map(([inst, name, f]) => ({ inst, name, ...f })),
});

// Uttar Pradesh minority private colleges: "UP NEET PG-2026 fee structure, minority private medical colleges" (upneet.gov.in,
// home-page notices; scanned college letters for session 2026-27, transcribed from the page images). Same fee for minority and
// general private seats at these colleges.
const L2 = (o: Record<string, number>) => ({ seat: o });
college('up2026_minority', {
  state: 'Uttar Pradesh', year: 2026, label: 'UP NEET PG 2026 minority college fee structures (upneet.gov.in)',
  source: 'https://upneet.gov.in/',
  quotas: { seat: '^(Minority|Private \\(state quota\\))$' },
  colleges: [
    { inst: 'UP careerinstituteofmedicalscienceslko', name: 'Career Institute of Medical Sciences & Hospital, Lucknow', courseFees: L2({
      'General Medicine': 4215000, Orthopaedics: 4065000, 'Obstetrics & Gynaecology': 4140000, 'General Surgery': 3710000, Radiodiagnosis: 4430000, Psychiatry: 2880000,
      ENT: 2000000, Dermatology: 4240000, 'Respiratory Medicine': 3765000, Ophthalmology: 3000000, Anaesthesiology: 2000000, Paediatrics: 3590000,
      'Community Medicine': 400000, Pathology: 1000000, Pharmacology: 200000, Microbiology: 200000, Physiology: 200000, Biochemistry: 200000, Anatomy: 200000 }) },
    { inst: 'UP fhmedicalcollegehospitalagra', name: 'F.H. Medical College & Hospital, Etmadpur, Agra', courseFees: L2({
      Anaesthesiology: 2350000, 'General Medicine': 4200000, Orthopaedics: 4100000, 'General Surgery': 3650000, Psychiatry: 2800000, Paediatrics: 4000000,
      Ophthalmology: 3650000, 'Obstetrics & Gynaecology': 4200000, Radiodiagnosis: 4250000, Dermatology: 4250000, ENT: 2500000, 'Respiratory Medicine': 3650000,
      Pathology: 1250000, Microbiology: 250000, 'Community Medicine': 250000 }) },
    { inst: 'UP integralinstituteofmedicalscienceslucknow', name: 'Integral Institute of Medical Sciences & Research, Lucknow', courseFees: L2({
      'Obstetrics & Gynaecology': 3995000, Paediatrics: 3895000, Dermatology: 4195000, Psychiatry: 2595000, 'General Surgery': 3495000, 'General Medicine': 3995000,
      Ophthalmology: 3595000, Orthopaedics: 3995000, Radiodiagnosis: 4195000, Anaesthesiology: 2195000, ENT: 2395000,
      Pathology: 1200000, Biochemistry: 280000, Microbiology: 280000, 'Community Medicine': 280000 }) },
    { inst: 'UP teerthankermahaveeruniversitymoradabad', name: 'Teerthanker Mahaveer Medical College & Research Centre, Moradabad', courseFees: L2({
      Radiodiagnosis: 3990000, Dermatology: 3990000, 'General Medicine': 3990000, Orthopaedics: 3720000, Paediatrics: 3810000, 'Obstetrics & Gynaecology': 3810000,
      Ophthalmology: 3240000, 'Respiratory Medicine': 3060000, 'General Surgery': 3150000, ENT: 2430000, Psychiatry: 2520000, Anaesthesiology: 2250000,
      Pathology: 1260000, Biochemistry: 10000, Microbiology: 10000, 'Community Medicine': 10000, Pharmacology: 10000, Anatomy: 10000, Physiology: 10000, 'Forensic Medicine': 10000 }) },
    { inst: 'UP eramedicalcollegelucknow', name: "Era's Lucknow Medical College & Hospital", courseFees: L2({
      'Obstetrics & Gynaecology': 3980000, Paediatrics: 3610000, 'Respiratory Medicine': 3200000, Dermatology: 3990000, Psychiatry: 2590000, 'General Surgery': 3200000,
      'General Medicine': 3960000, Ophthalmology: 3580000, Orthopaedics: 3980000, Radiodiagnosis: 3995000, Anaesthesiology: 2350000, ENT: 2450000,
      Pathology: 1090000, 'Community Medicine': 10000, Microbiology: 10000, Pharmacology: 10000, Biochemistry: 10000, Anatomy: 10000, Physiology: 10000 }) },
  ],
});

// Maharashtra private colleges: Fees Regulating Authority approved MD/MS fees, read from FRA's own fee search
// (mahafra.org → api.mahafraportal.org inst_fees_report_api, saved as data/parsed/fees_mh_fra2024.json). FRA's API returns
// nothing for 2025-26 and 2026-27 (server error on their side), so these are the 2024-25 approved tuition fees.
// One MD/MS fee per college; applies to state, institutional and minority seats (not NRI).
{
  const fra = JSON.parse(readFileSync('data/parsed/fees_mh_fra2024.json', 'utf8'));
  const MAP: Record<string, string[]> = {
    MBBS0001: ['MH KJMC MUMBAI'], MBBS0002: ['MH TERNA NEW MUMBAI'], MBBS0003: ['MH MIMER TALEGAON P'], MBBS0004: ['MH VPS NASIK'], MBBS0005: ['MH ACPM DHULE'],
    MBBS0006: ['MH NKP Salve NAGPUR'], MBBS0007: ['MH PDMC AMRAVATI'], MBBS0009: ['MH VVPF AHMEDNAGAR', 'MH VVPF AHILYANAGA'], MBBS0011: ['MH UPMC JALGAON'],
    MBBS0014: ['MH IIMSR JALNA'], MBBS0015: ['MH SMBT NANDIHILLS'], MBBS0016: ['MH BK WALAWAL RATNAGIRI'], MBBS1147: ['MH VEDANTA MC PALGHAR'],
    MDMS0008: ['MH SANJEEVAN MIRAJ'], MDMS0010: ['MH BHMS MUMBAI'],
  };
  const colleges: CollegeFees[] = [];
  for (const c of fra.colleges) {
    const r = c.rows.find((x: any) => x.status === 'Approved'), fee = Number(r?.tution_fees_fra);
    if (!fee) continue;
    for (const inst of MAP[c.inst_id] ?? []) colleges.push({ inst, name: c.fra_name, fees: { seat: [fee, fee, fee] } });
  }
  college('mh2024', { state: 'Maharashtra', year: 2024, label: 'Maharashtra FRA approved MD/MS tuition fee 2024-25 (mahafra.org)', source: 'https://mahafra.org/', quotas: { seat: '^(State Quota|Institutional|Minority)$' }, colleges });
}

// Haryana: Haryana Govt Gazette (Extra.) 2 Sept 2024, Annexure V(a)-(c) (dmer.haryana.gov.in "Fee structure of MD/MS courses").
// V(a) private unaided colleges affiliated to Pt BD Sharma UHS: tuition incl. development ₹3.52 L pre-clinical, ₹5.52 L
// para-clinical, ₹14.02 L clinical for 2024-25 "+10% annual increase" → 2025-26 values below (×1.1). NRI pay the same in US$.
// V(b) SGT University and V(c) Al-Falah University (2024-25): fee per subject per annum.
const hr = { all: [1402000 * 1.1, 552000 * 1.1, 352000 * 1.1].map(Math.round) as [number, number, number] };
college('hr2025', {
  state: 'Haryana', year: 2025, label: 'Haryana Govt Gazette 2-9-2024 MD/MS fee structure',
  source: 'https://dmer.haryana.gov.in/uploads/cand_images/MD_MS_Course_Fee.pdf',
  quotas: { all: '^(State Quota|State Quota \\(institutional preference\\)|In-service|Management|Minority)$' },
  colleges: [
    { inst: 'HR adeshmedicalcollegekurukshetra', name: 'Adesh Medical College, Kurukshetra', fees: hr },
    { inst: 'HR ncmedicalcollegeisranapanipat', name: 'NC Medical College, Israna', fees: hr },
    { inst: 'HR worldcollegeofmedsciresjhajjar', name: 'World College of Medical Sciences & Research, Jhajjar', fees: hr },
    { inst: 'HR sgtmedicalcollegeresearchinstitutebudheragurugram', name: 'SGT Medical College, Gurugram (SGT University)', courseFees: { all: {
      Anatomy: 1000000, Biochemistry: 1000000, 'Community Medicine': 1000000, 'Forensic Medicine': 1000000, Microbiology: 1000000, Pathology: 1700000,
      Physiology: 1000000, Pharmacology: 1000000, Dermatology: 4000000, Orthopaedics: 3200000, Ophthalmology: 2900000, 'General Medicine': 3500000,
      'Respiratory Medicine': 2900000, Psychiatry: 2900000, Paediatrics: 3200000, 'General Surgery': 3000000, ENT: 2200000, Anaesthesiology: 2000000,
      Radiodiagnosis: 4500000, 'Obstetrics & Gynaecology': 3500000 } } },
    { inst: 'HR alfalahuniversityfaridabad', name: 'Al-Falah School of Medical Sciences, Faridabad', courseFees: { all: {
      Anatomy: 720000, Biochemistry: 720000, 'Community Medicine': 912000, Paediatrics: 2990000, Microbiology: 720000, Pathology: 1455000, Physiology: 720000,
      Dermatology: 3290000, 'General Medicine': 2990000, Anaesthesiology: 1790000, 'Obstetrics & Gynaecology': 2990000 } } },
  ],
});

// Odisha: Govt of Odisha SD&TE notification No. SDTE-HTE-HTE-I-0010-2017/5332 dt 16-08-2025 (fees w.e.f. 2025-26,
// odishajee.com/news_document/5332_374.pdf). Hi-Tech Bhubaneswar: Anatomy/Physiology/Biochemistry, para-clinical, clinical;
// Hi-Tech Rourkela: para-clinical and clinical only.
college('od2025', {
  state: 'Odisha', year: 2025, label: 'Govt of Odisha fee notification 16-08-2025 (Hi-Tech colleges)',
  source: 'https://odishajee.com/news_document/5332_374.pdf',
  quotas: { all: '^(Private \\(state quota\\)|Management)$' },
  colleges: [
    { inst: 'OD HI-TECH MCH BHUBANESWAR', name: 'Hi-Tech Medical College & Hospital, Bhubaneswar', fees: { all: [1733500, 867000, 693500] } },
    { inst: 'OD HI-TECH MCH ROURKELA', name: 'Hi-Tech Medical College & Hospital, Rourkela', fees: { all: [1281000, 641000, 0] } },
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
