/**
 * Parsed round JSONs (2023–2026) + seat matrices (2023–2026) + institute profiles → data/pgdata.json.
 * Normalises quota/category/course spellings across years, links allotment institutes to MCC institute codes
 * (the seat matrices print the code after every name), and assigns each institute a state.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const load = (p: string) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { rows: [] });
type SmRow = { code: string; institute: string; state: string; branch: string; quota: string; category: string; seats: number };
const matrices = readdirSync('data/parsed').filter((f) => /^sm20\d\d_[a-z]+\.json$/.test(f))
  .map((f) => ({ year: Number(f.slice(2, 6)), kind: f.slice(7, -5), rows: load(`data/parsed/${f}`).rows as SmRow[] }));
const profiles: Record<string, Record<string, string | number | null>> = load('data/parsed/profiles_2026.json').profiles ?? {};

const U = 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/';
// file → [round label, official PDF]
const SOURCES: Record<string, [string, string]> = {
  mcc2023_r1: ['Round 1', '2023/08/2023080855.pdf'], mcc2023_r2: ['Round 2', '2023/08/2023083188.pdf'], mcc2023_r3: ['Round 3', '2023/09/2023092816.pdf'],
  mcc2023_stray: ['Stray', '2023/10/2023101632-1.pdf'], mcc2023_sstray: ['Special stray', '2023/11/2023112564.pdf'],
  mcc2024_r1: ['Round 1', '2024/11/2024112085.pdf'], mcc2024_r2: ['Round 2', '2024/12/2024121477.pdf'], mcc2024_r3: ['Round 3', '2025/01/2025012533.pdf'],
  mcc2024_stray: ['Stray', '2025/02/2025021923.pdf'], mcc2024_sstray: ['Special stray', '2025/03/2025031272.pdf'],
  mcc2025_r1: ['Round 1', '2025/11/202511221303622410.pdf'], mcc2025_r2: ['Round 2', '2025/12/202512172132273940.pdf'], mcc2025_r3: ['Round 3', '2026/02/20260206892439077.pdf'],
  mcc2025_stray: ['Stray', '2026/02/20260223177387794.pdf'],
  mcc2026_r1: ['Round 1', '2026/10/202610241746468472.pdf'],
};
// seat-matrix file (data/raw/sm<year>_<kind>.pdf) → official PDF
const SM_SOURCES: Record<string, string> = {
  sm2023_aiq: '2023/07/2023073097.pdf', sm2023_central: '2023/07/2023072950.pdf', sm2023_deemed: '2023/07/2023072986.pdf', sm2023_dnb: '2023/07/2023073045.pdf',
  sm2024_aiq: '2024/11/2024111122.pdf', sm2024_central: '2024/11/2024110917.pdf', sm2024_deemed: '2024/11/2024110963.pdf', sm2024_dnb: '2024/11/2024111377.pdf',
  sm2025_aiq: '2025/10/202510281305634189.pdf', sm2025_central: '2025/10/20251028847832917.pdf', sm2025_deemed: '2025/11/20251119105316139.pdf', sm2025_dnb: '2025/11/20251119228358966.pdf',
  sm2026_aiq: '2026/10/202610151676193504.pdf', sm2026_central: '2026/10/202610151906520168.pdf', sm2026_deemed: '2026/10/20261015907178910.pdf', sm2026_dnb: '2026/10/202610151482599908.pdf',
};
const ROUND_ORDER = ['Round 1', 'Round 2', 'Round 3', 'Mop-up', 'Additional mop-up', 'Stray', 'Stray 2', 'Special stray', 'Special stray 2', 'Final (all rounds)'];

const STATES = ['Andaman And Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra And Nagar Haveli', 'Daman And Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu And Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
// Address spellings / big cities that identify a state when the state name itself is absent.
const ALIASES: [RegExp, string][] = [
  [/new delhi|\bdelhi\b|cannaught|connaught/i, 'Delhi'],
  [/mumbai|pune|nagpur|aurangabad|nashik|kolhapur|sangli|dhule|solapur|thane|latur|akola|ambajogai|yavatmal|maharashtra/i, 'Maharashtra'],
  [/chennai|madurai|coimbatore|tirunelveli|salem|thanjavur|vellore|trichy|tamilnadu/i, 'Tamil Nadu'],
  [/bangalore|bengaluru|mysore|mysuru|mangalore|hubli|belgaum|belagavi|gulbarga|kalaburagi|davangere|tumkur|tumakuru|manipal/i, 'Karnataka'],
  [/hyderabad|secunderabad|warangal|gachibowli|telangana/i, 'Telangana'],
  [/kolkata|calcutta|burdwan|darjeeling|siliguri/i, 'West Bengal'],
  [/ahmedabad|surat|vadodara|baroda|rajkot|bhavnagar|jamnagar|gandhinagar/i, 'Gujarat'],
  [/jaipur|jodhpur|udaipur|bikaner|ajmer|kota|bharatpur/i, 'Rajasthan'],
  [/lucknow|kanpur|varanasi|varansi|prayagraj|allahabad|aligarh|agra|meerut|gorakhpur|jhansi|noida|ghaziabad|etah/i, 'Uttar Pradesh'],
  [/bhopal|indore|gwalior|jabalpur|rewa|sagar|m\.p\./i, 'Madhya Pradesh'],
  [/patna|darbhanga|muzaffarpur|gaya|bhagalpur/i, 'Bihar'],
  [/cuttack|bhubaneswar|berhampur|burla|sambalpur|orissa/i, 'Odisha'],
  [/thiruvananthapuram|trivandrum|kozhikode|calicut|kochi|thrissur|kottayam|alappuzha|kannur/i, 'Kerala'],
  [/visakhapatnam|vijayawada|guntur|kurnool|tirupati|nellore|kakinada|anantapur/i, 'Andhra Pradesh'],
  [/chandigarh/i, 'Chandigarh'],
  [/ludhiana|amritsar|patiala|faridkot|ferozepur|mohali/i, 'Punjab'],
  [/rohtak|faridabad|gurgaon|gurugram|karnal|hisar/i, 'Haryana'],
  [/srinagar|jammu/i, 'Jammu And Kashmir'],
  [/dehradun|haldwani|rishikesh|uttaranchal|rudrapur/i, 'Uttarakhand'],
  [/shimla|kangra|mandi/i, 'Himachal Pradesh'],
  [/ranchi|dhanbad|jamshedpur/i, 'Jharkhand'],
  [/raipur|bilaspur|jagdalpur/i, 'Chhattisgarh'],
  [/guwahati|dibrugarh|silchar/i, 'Assam'],
  [/pondicherry|puducherry/i, 'Puducherry'],
  [/churu/i, 'Rajasthan'], [/palakkad/i, 'Kerala'], [/kannauj|fatehpur/i, 'Uttar Pradesh'], [/almora/i, 'Uttarakhand'],
  [/chikkaballapur|chikkamagaluru|karnata/i, 'Karnataka'], [/anantnag|baramulla|j&k/i, 'Jammu And Kashmir'], [/korba|\bc\.g\./i, 'Chhattisgarh'],
  [/imphal/i, 'Manipur'], [/shillong/i, 'Meghalaya'], [/agartala/i, 'Tripura'], [/gangtok/i, 'Sikkim'], [/panaji|bambolim/i, 'Goa'],
];
const stateFromText = (s: string) => {
  const low = s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ');
  return STATES.find((st) => low.includes(st.toLowerCase())) || ALIASES.find(([re]) => re.test(s))?.[1] || '';
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- normalisation ----
const QUOTA: Record<string, string> = {
  AM: 'Aligarh Muslim University', AI: 'All India', AF: 'Armed Forces Medical', BH: 'Banaras Hindu University', DU: 'Delhi University Quota',
  AD: 'DNB Quota', IP: 'IP University Quota', JM: 'Jain Minority Quota', MM: 'Muslim Minority Quota', NR: 'Non-Resident Indian', PS: 'Self-Financed Merit Seat',
  'Management/Paid Seats Quota': 'Self-Financed Merit Seat', 'Self-Financed Merit Seat/(Paid Seat Quota)': 'Self-Financed Merit Seat',
};
const QUOTA_NAMES = ['Aligarh Muslim University', 'All India', 'Armed Forces Medical', 'Banaras Hindu University', 'Delhi University Quota',
  'DNB Quota', 'IP University Quota', 'Jain Minority Quota', 'Muslim Minority Quota', 'Non-Resident Indian', 'Self-Financed Merit Seat'];
const quotaByKey = new Map<string, string>([...Object.entries(QUOTA), ...QUOTA_NAMES.map((n) => [n, n] as [string, string])].map(([k, v]) => [norm(k), v]));
const normQuota = (q: string) => quotaByKey.get(norm(q)) ?? q.trim();
const CAT: Record<string, string> = { GN: 'Open', BC: 'OBC', EW: 'EWS', General: 'Open' };
const normSeatCat = (c: string) => {
  const m = c.trim().match(/^(\w+)\s*(PwD|PH|Yes)?$/i);
  if (!m) return c.trim();
  return (CAT[m[1]] ?? m[1]) + (m[2] ? ' PwD' : '');
};
const normCandCat = (c: string) => {
  const m = c.trim().match(/^(GN|General|OBC|BC|EWS|EW|SC|ST)\s*(PwD|PH|Yes)?$/i);
  if (!m) return c.trim();
  const base = ({ GN: 'General', BC: 'OBC', EW: 'EWS' } as Record<string, string>)[m[1]] ?? m[1];
  return base + (m[2] ? ' PwD' : '');
};
const SPECIALTY: [RegExp, string][] = [
  [/cardiovascular|thoracic/, 'Cardiothoracic Surgery (6-yr)'], [/neurosurgery/, 'Neurosurgery (6-yr)'],
  [/paediatricsurgery/, 'Paediatric Surgery (6-yr)'], [/plastic/, 'Plastic Surgery (6-yr)'],
  [/generalmedicine/, 'General Medicine'], [/generalsurgery/, 'General Surgery'], [/trauma/, 'Traumatology & Surgery'],
  [/obst|gyna|gyne|obgy/, 'Obstetrics & Gynaecology'], [/paediatric|childhealth/, 'Paediatrics'],
  [/radiationmedicine/, 'Radiation Medicine'], [/radio-?therap|radiation/, 'Radiation Oncology'], [/radio-?diag|radiology/, 'Radiodiagnosis'],
  [/derm|d\.d\.v\.l|venere|skin/, 'Dermatology'], [/ortho/, 'Orthopaedics'], [/ophthal|opthal/, 'Ophthalmology'],
  [/otorhino|oto-rhino|e\.?n\.?t\b|\bent\b/, 'ENT'], [/anaesth|anesth/, 'Anaesthesiology'], [/psychiat|psycholog/, 'Psychiatry'],
  [/respiratory|tuberculosis|t\.b\.|chest|pulmonary/, 'Respiratory Medicine'], [/emergency/, 'Emergency Medicine'], [/family/, 'Family Medicine'],
  [/forensic/, 'Forensic Medicine'], [/community|preventive|publichealth|epidemiolog|p\.s\.m/, 'Community Medicine'],
  [/administration|admn/, 'Hospital Administration'], [/immuno|transfusion/, 'Immunohaematology & Transfusion'],
  [/microbio|bacterio/, 'Microbiology'], [/laboratory/, 'Laboratory Medicine'], [/patholog/, 'Pathology'], [/pharmacol/, 'Pharmacology'],
  [/physiolog/, 'Physiology'], [/bio-?chem/, 'Biochemistry'], [/anatomy/, 'Anatomy'], [/physicalmed|phy\.medicine|phy\.med|rehab/, 'Physical Medicine & Rehab'],
  [/geriatric|geritric/, 'Geriatrics'], [/palliative/, 'Palliative Medicine'], [/nuclear/, 'Nuclear Medicine'], [/sport/, 'Sports Medicine'],
  [/tropical/, 'Tropical Medicine'], [/aerospace/, 'Aerospace Medicine'], [/diabetolog/, 'Diabetology'],
  [/^medicine$/, 'General Medicine'], [/^surgery$/, 'General Surgery'], // state lists' short names
];
const programOf = (raw: string) => { const c = raw.replace(/\s+/g, ''); return /^\(NBEMS-DIPLOMA\)/i.test(c) ? 'DNB Diploma' : /^\(NBEMS\)/i.test(c) ? 'DNB'
  : /^(DIP|PGDiploma)|\(D\.D\.V\.L\.\)/i.test(c) ? 'Diploma' : /^M\.Ch/i.test(c) ? 'M.Ch' : 'MD/MS'; };
const unmatchedCourses = new Set<string>();
const normCourse = (c: string) => {
  const low = c.toLowerCase().replace(/\s+/g, '');
  const spec = SPECIALTY.find(([re]) => re.test(low))?.[1];
  if (!spec) { unmatchedCourses.add(c); return c; }
  return `${spec} (${programOf(c)})`;
};

// ---- institute registry from the seat matrices, keyed by MCC institute code ----
const key1 = (s: string) => norm(s.split(',')[0]);
const key2 = (s: string) => norm(s.split(',').slice(0, 2).join(','));
const KIND_TYPE: Record<string, string> = { aiq: 'Government / AIQ', central: 'Central university', deemed: 'Deemed university', dnb: 'DNB hospital' };
const registry = new Map<string, { names: string[]; state: string; kinds: Set<string> }>();
for (const m of matrices) for (const r of m.rows) {
  let e = registry.get(r.code);
  if (!e) registry.set(r.code, (e = { names: [], state: '', kinds: new Set() }));
  if (!e.names.includes(r.institute)) e.names.push(r.institute);
  if (r.state && !e.state) e.state = r.state.replace(/([a-z])([A-Z])/g, '$1 $2');
  e.kinds.add(m.kind);
}
// Some PDFs drop the spaces between words; show the best-spaced spelling.
const spacing = (s: string) => (s.match(/ /g)?.length ?? 0) / Math.max(1, s.length);
const codeName = (code: string) => [...registry.get(code)!.names].sort((a, b) => spacing(b) - spacing(a))[0].split(',')[0].trim();
const codeState = (code: string) => { const e = registry.get(code)!; return STATES.find((x) => norm(x) === norm(e.state)) || stateFromText(e.names.join(' ')) || e.state; };
// name keys → code, per season first (names drift between years), then across all seasons.
const codeByKey2Y = new Map<string, string>(), codeByKey2 = new Map<string, string>();
const codeByKey1Y = new Map<string, Set<string>>(), codeByKey1 = new Map<string, Set<string>>();
const addSet = (m: Map<string, Set<string>>, k: string, v: string) => { const x = m.get(k); if (x) x.add(v); else m.set(k, new Set([v])); };
for (const m of matrices) for (const r of m.rows) {
  codeByKey2Y.set(`${m.year}|${key2(r.institute)}`, r.code); codeByKey2.set(key2(r.institute), r.code);
  addSet(codeByKey1Y, `${m.year}|${key1(r.institute)}`, r.code); addSet(codeByKey1, key1(r.institute), r.code);
}
const only = (x?: Set<string>) => (x?.size === 1 ? [...x][0] : undefined);
const codeFor = (full: string, year: number) =>
  codeByKey2Y.get(`${year}|${key2(full)}`) ?? codeByKey2.get(key2(full)) ?? only(codeByKey1Y.get(`${year}|${key1(full)}`)) ?? only(codeByKey1.get(key1(full))) ?? '';

function dict() { const arr: string[] = [], m = new Map<string, number>(); return { arr, get: (v: string) => { let i = m.get(v); if (i == null) { i = arr.length; arr.push(v); m.set(v, i); } return i; } }; }
const course = dict(), quota = dict(), acat = dict(), ccat = dict();
const inst: [string, string, string, string][] = [], instM = new Map<string, number>();
const instIndex = (full: string, year: number, given?: { display: string; code: string; state: string }) => {
  const ik = norm(full);
  let i = instM.get(ik);
  if (i != null) return i;
  const cut = full.search(/,(?=\S)/);
  const display = given?.display ?? (cut > 0 ? full.slice(0, cut) : full.split(',').slice(0, 2).join(',')).trim().replace(/\s+/g, ' ');
  const code = given ? given.code : codeFor(full, year);
  const state = given?.state || (code && codeState(code)) || stateFromText(full);
  i = inst.length; inst.push([display, full, state, code]); instM.set(ik, i);
  return i;
};

// ---- state counselling (see pipeline/states/*) ----
// Tamil Nadu (Selection Committee): college names are matched to MCC codes by name; diplomas are abbreviated.
const TN_DIP: Record<string, string> = { 'D.A.': 'Diploma in Anaesthesiology', 'D.C.H.': 'Diploma in Child Health', 'D.C.P.': 'Diploma in Clinical Pathology',
  'D.D.V.L.': 'Diploma in Dermatology, Venereology and Leprosy', 'D.G.O': 'Diploma in Obstetrics and Gynaecology', 'D.L.O.': 'Diploma in Otorhinolaryngology',
  'D.O.': 'Diploma in Ophthalmology', 'D.ORTHO': 'Diploma in Orthopaedics' };
const tnCourse = (c: string) => { const t = c.replace(/\s+K A P$/, '').trim(); return TN_DIP[t] ?? t.replace(/^M\. D\. \(P\.M\.R\)$/, 'M.D. Physical Medicine and Rehabilitation').replace(/^M\. D\./, 'M.D.'); };
// names the generic matcher misses; colleges not listed here and not matched are state-only private colleges with no MCC code
const TN_CODES: Record<string, string> = {
  'VISWANATHAN GOVERNMENT MEDICAL COLLEGE, TRICHY': '700352', 'MOHAN KUMARAMANGALAM MEDICAL COLLEGE, SALEM': '700350',
  'ESI-PGIMSR,ESI HOSPITAL,K.K NAGAR,CHENNAI': '700353', 'CANCER INSTITUTE, ADAYAR': '701542', 'SANKARA NETHRALAYA, CHENNAI': '901768',
  'GOVT. THIRUVALLUR MEDICAL COLLEGE HOSPITAL,': '904561', 'CUDDALORE MEDICAL COLLEGE, ANNAMALAINAGAR': '700544',
  'DHANALAKSHMI SRINIVASAN INSTITUTE OF MEDICAL SCIENCES AND HOSPITAL, PERAMBALUR': '905684',
  'DHANALAKSHMI SRINIVASAN INSTITUTE OF MEDICAL SCIENCES AND HOSPITAL, PERAMBALUR (PRIVATE UNIVERSITY)': '905684',
  'KARPAGA VINAYAGA INSTITUTE OF MEDICAL SCIENCES,MADURANTHAGAM': '905716', 'ST.PETERS MEDICAL COLLEGE HOSPITAL AND RESEARCH INSTITUTE, KRISHNAGIRI': '905712',
};
const TN_COMM: Record<string, string> = { OC: 'General', BC: 'BC', BCM: 'BC (Muslim)', 'MBC&DNC': 'MBC/DNC', MBC: 'MBC/DNC', SC: 'SC', SCA: 'SC (Arunthathiyar)', ST: 'ST' };
const tnQuota = (q: string, inService: boolean) => (q === 'MQ' ? 'Management' : q === 'NRI' ? 'NRI' : inService ? 'Government quota (in-service, incentive marks)' : 'Government quota');

// Maharashtra college abbreviations → MCC institute codes (government colleges that also offer AIQ seats).
const MH_CODES: Record<string, string> = {
  'GSMC MUMBAI': '700310', 'GMC MUMBAI': '700305', 'GMC NAGPUR': '700303', 'LTMC MUMBAI': '700307', 'BJMC PUNE': '700301',
  'GMC SAMBHAJINA': '700304', 'TNMC MUMBAI': '700313', 'IGMC NAGPUR': '700306', 'TATA MUMBAI': '700321', 'GMC NANDED': '700314',
  'GMC MIRAJ': '700309', 'VMMC SOLAPUR': '700302', 'SRTR AMBAJOGAI': '700312', 'MGIMS SEVAGRAM,W': '700466', 'GMC LATUR': '700322',
  'GMC AKOLA': '700328', 'GMC KOLHAPUR': '701496', 'GMC JALGAON': '701704', 'HBT & COOP JUHU, MUMB': '700540', 'VNMC YEOTMAL': '700315',
  'PCMC PGM I PIMPARI, P': '700523', 'MPGIMER NASHIK': '701701', 'CGMC CHANDRAPUR': '701717', 'Rajeev Gan THANE': '700517',
  'B Hire DHULE': '903317', 'GGMC GONDIA': '701705', 'GMC BARAMATI': '901804', 'PGIMS NEW MUMBAI': '903367', 'GMC NANDURBAR': '904640',
  'BARC MUMBAI': '700501', 'AIIPMR MUMBAI': '700318',
};
const MH_DIPLOMA: Record<string, string> = {
  'D.A.': 'Diploma in Anaesthesiology', 'D.P.H.': 'Diploma in Public Health', 'D.V.D.': 'Diploma in Dermatology', 'D.G.O.': 'Diploma in Obstetrics and Gynaecology',
  'D.M.R.D.': 'Diploma in Radiodiagnosis', 'D.C.H.': 'Diploma in Child Health', 'D.P.M.': 'Diploma in Psychiatry', 'D.D. (DIABET)': 'Diploma in Diabetology',
  'D.O.': 'Diploma in Ophthalmology', 'D.ORTHO': 'Diploma in Orthopaedics', 'D.L.O.': 'Diploma in Otorhinolaryngology', 'D.O.R.L.': 'Diploma in Otorhinolaryngology', 'D.C.P.': 'Diploma in Clinical Pathology',
  'D.F.M.': 'Diploma in Forensic Medicine', 'D.M.R.T.': 'Diploma in Radiotherapy', 'D.T.C.D.': 'Diploma in Tuberculosis and Chest Diseases',
};
// Maharashtra seat codes → [quota suffix, seat category]
const mhSeat = (token: string): [string, string] => {
  const t = token.toUpperCase().replace(/\.$/, '');
  if (t === 'I.Q' || t === 'IQ') return ['Institutional', 'Open'];
  if (t === 'NRI') return ['NRI', 'Open'];
  if (t.startsWith('MINORIT')) return ['Minority', 'Open'];
  if (t === 'IS') return ['In-service', 'Open'];
  if (t === 'ISPH') return ['In-service', 'Open PwD'];
  if (t === 'PH') return ['State Quota', 'Open PwD'];
  if (t.startsWith('ORPHAN')) return ['State Quota', 'Orphan'];
  const base = t.replace(/^EM/, ''); // EM-prefixed seats are reserved within the same category
  const named: Record<string, string> = { OPEN: 'Open', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS', SEBC: 'SEBC', NTB: 'NT-B', NTC: 'NT-C', NTD: 'NT-D', VJA: 'VJ-A', SBC: 'SBC' };
  return ['State Quota', named[base] ?? base];
};
const mhCandidate = (cat: string) => {
  const [first] = cat.toUpperCase().split(/\s+/);
  const named: Record<string, string> = { OPEN: 'General', MIN: 'General', NRI: 'General', ORA: 'General', ORC: 'General', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS',
    SEBC: 'SEBC', NTB: 'NT-B', NTC: 'NT-C', NTD: 'NT-D', VJA: 'VJ-A', PWD: 'General' };
  return (named[first] ?? first) + (/PWD/.test(cat.toUpperCase()) ? ' PwD' : '');
};
// Karnataka (KEA): college code (M01…) → MCC institute code. Only government colleges, deemed universities and
// DNB hospitals have MCC codes; private colleges do not take part in MCC PG counselling. Checked by hand.
const KA_CODES: Record<string, string> = {
  M01: '700391', M02: '700399', M03: '700394', M04: '700396', M05: '700414', M06: '700416', M07: '700413', M08: '700415',
  M09: '700411', M10: '700408', M11: '700403', M12: '700401', M13: '701411', M32: '700425', M33: '700424', M34: '700509',
  M35: '700426', M36: '700429', M37: '700430', M38: '905686', M40: '700432', M48: '901783', M49: '700525', M50: '701350',
  M51: '700539', M55: '701400', M57: '701403', M60: '701502', M61: '701511', M62: '701512', M64: '701724', M66: '905568',
  M67: '904562', M68: '904558',
};
// In-service lists name DNB hospitals without a KEA college code.
const KA_NAMES: [RegExp, string][] = [
  [/^Bangalore Medical College/i, '700391'], [/Aralaguppe/i, '700837'], [/District Hospital, Ballari/i, '700823'],
  [/District Hospital, Bagalkot/i, '701312'], [/District Hospital, Chitradurga/i, '700818'], [/District Hospital, Dharwad/i, '700819'],
  [/District Hospital, Tumakuru/i, '700821'], [/District Hospital, Vijayapura/i, '700815'], [/Epidemiological/i, '904533'],
  [/General Hospital, Doddaballapura/i, '701437'], [/General Hospital, Gokak/i, '701581'], [/General Hospital, Holenarasipura/i, '700841'],
  [/General Hospital, Jayanagar/i, '700817'], [/General Hospital, Kanakapura/i, '701317'], [/General Hospital, Pavagada/i, '701315'],
  [/General Hospital, Tiptur/i, '701583'], [/JAYACHAMARAJENDRA/i, '701653'], [/^KC General/i, '700820'], [/SNR District/i, '700816'],
  [/Sir CV Raman/i, '700829'], [/Gangavathi/i, '701485'], [/Sagara/i, '701318'], [/Bhadravathi/i, '701655'], [/Saundatti/i, '701490'],
];
const KA_MINORITY = new Set(['ME', 'MM', 'MU', 'MC', 'MA', 'RC1', 'RC2', 'RC3']);
const KA_RESERVED: Record<string, string> = { GM: 'Open', '1': 'Cat-1', '2A': 'Cat-2A', '2B': 'Cat-2B', '3A': 'Cat-3A', '3B': 'Cat-3B', S1: 'SC', S2: 'SC', S3: 'SC', ST: 'ST' };
/** KEA allotted category + seat type letter → [quota suffix, seat category].
 *  Codes end in G (general) or H (Kalyana Karnataka, Article 371J); a leading P marks a PwD seat; GMP = general merit, private seat. */
const kaSeat = (cat: string, seatType: string, inService: boolean): [string, string] => {
  let c = cat.toUpperCase().trim();
  const kk = /H$/.test(c) && !['NRI'].includes(c);
  if (kk) c = c.slice(0, -1);
  if (['MNG', 'NRI', 'OPN'].includes(c) || KA_MINORITY.has(c)) {
    const q = c === 'MNG' ? 'Management' : c === 'NRI' ? 'NRI' : c === 'OPN' ? 'Private (open to all)' : 'Minority';
    return [inService ? 'In-service' : q, 'Open'];
  }
  const pwd = /^P(?=GM|1|2A|2B|3A|3B|S\d|ST)/.test(c);
  if (pwd) c = c.slice(1);
  if (c === 'GMP') c = 'GM';
  c = c.replace(/G$/, '') || 'GM';
  if (c === 'GM' || c === '') c = 'GM';
  const seat = (KA_RESERVED[c] ?? c) + (pwd ? ' PwD' : '');
  const q = inService ? 'In-service' : seatType === 'P' ? 'Private' : seatType === 'Q' ? 'Management' : seatType === 'N' ? 'NRI' : 'Government';
  return [kk && !inService ? `${q} (Kalyana Karnataka)` : q, seat];
};
const kaCourse = (c: string) => c.replace(/^DNB\s+(in\s+)?/i, '(NBEMS) ');
// Kerala (CEE): college code → MCC institute code (government colleges and cancer centres; self-financing colleges have none).
const KL_CODES: Record<string, string> = {
  ALP: '700285', KKM: '700287', KTM: '700289', TCM: '700290', TVM: '700291', RCC: '700293', CMC: '700295', KNM: '700529',
  MLP: '701401', KLM: '701699', PKM: '904371', MCG: '904554',
};
// Kerala's SEBC sub-groups (state backward classes), plus national categories.
const KL_CATS: Record<string, string> = {
  SM: 'Open', EW: 'EWS', SC: 'SC', ST: 'ST', PD: 'Open PwD', CD: 'Open', OE: 'Open',
  EZ: 'SEBC (Ezhava)', MU: 'SEBC (Muslim)', BH: 'SEBC (OBC Hindu)', LA: 'SEBC (Latin Catholic)', BX: 'SEBC (OBC Christian)',
  KU: 'SEBC (Kudumbi)', DV: 'SEBC (Dheevara)', VK: 'SEBC (Viswakarma)', KN: 'SEBC (Kusavan)',
};
/** CEE allotted category → [quota suffix, seat category]. "#", "*" mark provisional allotments and are dropped. */
const klSeat = (cat: string): [string, string] => {
  const c = cat.replace(/[#*]+$/, '').toUpperCase();
  if (['AC', 'NC', 'MM', 'NM'].includes(c)) return ['Minority', 'Open'];
  if (c === 'NR') return ['NRI', 'Open'];
  if (c === 'MQ') return ['Management', 'Open'];
  if (c === 'HQ' || c === 'IQ') return ['In-service', 'Open'];
  return ['State Quota', KL_CATS[c] ?? c];
};
const klCandidate = (cat: string) => (!cat ? 'Not stated' : cat === 'General' ? 'General' : cat === 'EW' ? 'EWS' : KL_CATS[cat] ?? cat);
// Andhra Pradesh (Dr NTR UHS): college code → MCC institute code (government colleges).
const AP_CODES: Record<string, string> = {
  M001: '700475', M002: '700469', M003: '700474', M004: '700470', M005: '700471', M006: '700472', M008: '700473', M018: '700486',
  M019: '700485', M022: '700487', M025: '701720', M031: '904578', M032: '904570', M033: '904559', M034: '904577', M035: '904579',
  M036: '901808',
};
/** Dr NTR UHS seat (CQ/MQ/CA-SF) + sub category + candidate area → quota suffix.
 *  Competent-authority (CQ) seats are reserved by local area: AU (Andhra University region), SVU (Sri Venkateswara University
 *  region); AP / APNL / Others are the unreserved seats open across the state. */
const apQuota = (seat: string, sub: string, area: string) => {
  if (sub === 'Service') return 'In-service';
  if (seat === 'MQ') return sub === 'NRI' ? 'NRI' : sub === 'Institutional' ? 'Institutional' : 'Management';
  if (seat === 'CA-SF') return 'Self-finance';
  return area === 'AU' ? 'State Quota (AU local)' : area === 'SVU' ? 'State Quota (SVU local)' : 'State Quota (unreserved)';
};
const apSeat = (cat: string) => {
  const c = cat.toUpperCase().replace(/\s+/g, '');
  if (c === 'OC') return 'Open';
  if (c === 'OC-PH') return 'Open PwD';
  if (/^BC[A-E]$/.test(c)) return `BC-${c[2]}`;
  if (/^SC\d$/.test(c)) return 'SC';
  if (c === 'ST') return 'ST';
  return 'Open'; // Management / NRI / Institutional / Self-Finance / MINORITY are quota names, not categories
};
// Rajasthan: college name (letters only) → MCC institute code (government colleges and the district hospitals that
// take in-service diploma/DNB candidates).
const RJ_CODES: Record<string, string> = {
  smsmedicalcollegejaipur: '700327', jlnmcajmer: '700311', spmcbikaner: '700317', rntmcudaipur: '700332', govtmedicalcollegekota: '700334',
  drsnmcjodhpur: '700308', jhalawarmedicalcollegejhalawar: '700337', ruhscollegeofmedicalsciences: '700524', gmcpali: '901805',
  gmcbhilwara: '901863', shrijagannathpahadiyamedicalcollegebharatpurorgmcbharatpur: '901806', esicmedicalcollegeandhospitalalwar: '904560',
  gmcchuru: '901803', gmcdungarpur: '901860', geetanjalimedicalcollegehospitaludaipur: '902746',
  skhospitalsikar: '701077', ghbarmer: '701060', ghsawaimadhopur: '701061', governmentbdkhospitaljhunjhunu: '701064',
  districthospitaldholpur: '701059', dhbundi: '701057', dhnagaur: '701062', ghkarauli: '701080', dhbaran: '701078', dhtonk: '701326',
  dhhanumangarh: '701067', dhsriganganagar: '701071', mghbhilwara: '701065', governmenthospitalalwar: '701073',
  govtdbgeneraldistricthospitalchuru: '701058', shriharideojoshigeneralhospitaldungarpur: '701076', govtrdbpjaipuriahospitaljaipur: '701045',
  dhchittorgarh: '701081', dhsirohi: '701072', dhpratapgarh: '701068', dhdausa: '701079', dhrajsamand: '701070',
};
const RJ_SEAT: Record<string, string> = { GENERAL: 'Open', OBCNCL: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS', MBCNCL: 'MBC' };
/** Seat type → quota. "AI" seats in private colleges are open to candidates from any state. */
const rjQuota = (t: string) => (/^AI$/i.test(t) ? 'Private (open to all)' : /manage/i.test(t) ? 'Management' : 'State Quota');
const rjCourse = (c: string) => c.replace(/^Post\s*MBBS\s*Diploma\s*\(?\s*([^)]*)\)?/i, 'Diploma in $1').replace(/^(MD|MS)\s*\(\s*(.*)\)$/i, '$1 $2');
const spaced = (s: string) => s.replace(/([a-z.,&)])([A-Z(])/g, '$1 $2').replace(/,(?=\S)/g, ', ').replace(/\s+/g, ' ').trim();
const RJ_NAMES: Record<string, string> = {
  smsmedicalcollegejaipur: 'SMS Medical College, Jaipur', jlnmcajmer: 'JLN Medical College, Ajmer', spmcbikaner: 'SP Medical College, Bikaner',
  rntmcudaipur: 'RNT Medical College, Udaipur', drsnmcjodhpur: 'Dr SN Medical College, Jodhpur', govtmedicalcollegekota: 'Government Medical College, Kota',
  mghbhilwara: 'MG Hospital, Bhilwara', rbmhospitalbharatpur: 'RBM Hospital, Bharatpur', skhospitalsikar: 'SK Hospital, Sikar',
  shrijagannathpahadiyamedicalcollegebharatpurorgmcbharatpur: 'Shri Jagannath Pahadiya Medical College, Bharatpur',
  ruhscollegeofmedicalsciences: 'RUHS College of Medical Sciences, Jaipur',
  governmentbdkhospitaljhunjhunu: 'Government BDK Hospital, Jhunjhunu', govtamritkaurhospitalbeawar: 'Government Amrit Kaur Hospital, Beawar',
  esicmedicalcollegeandhospitalalwar: 'ESIC Medical College and Hospital, Alwar', governmenthospitalalwar: 'Government Hospital, Alwar',
  drsstantiamedicalcollegehospitalanaresearchcentersriganganagar: 'Dr S S Tantia Medical College, Hospital and Research Center, Sri Ganganagar',
  govtrdbpjaipuriahospitaljaipur: 'Government RDBP Jaipuria Hospital, Jaipur', jhalawarmedicalcollegejhalawar: 'Jhalawar Medical College, Jhalawar',
  govtdistricthospitalkekriajmer: 'Government District Hospital, Kekri (Ajmer)', shriharideojoshigeneralhospitaldungarpur: 'Shri Hari Deo Joshi General Hospital, Dungarpur',
};
/** Rajasthan lists glue words together; expand the abbreviations and pick the best-spaced spelling seen. */
const rjBest = new Map<string, string>();
const rjDisplay = (raw: string, nk: string) => {
  if (RJ_NAMES[nk]) return RJ_NAMES[nk];
  const best = rjBest.get(nk) ?? raw;
  const s = spaced(best).replace(/\.$/, '');
  return s.replace(/^DH\s*/, 'District Hospital, ').replace(/^GH\s*/, 'Government Hospital, ').replace(/^GMC\s*/, 'Government Medical College, ');
};
// Telangana (KNRUHS): college code → MCC institute code (government colleges).
const TG_CODES: Record<string, string> = {
  'NIMS(001)': '700484', 'GAND(010)': '700481', 'OMCH(011)': '700483', 'KKTI(012)': '700482', 'GVNZ(013)': '700518', 'GMCM(014)': '700536',
  'RADL(015)': '700535', 'SGMC(017)': '701700', 'GMSR(018)': '701716', 'GMNL(019)': '701702', 'SIMS(021)': '904639',
};
/** KNRUHS "Adm Details" (e.g. NS-BCB-FEM-MRC-P1, MQ1-UNR-MSM-P3) → [quota suffix, seat category].
 *  NS/S = non-service / in-service; MQ1/MQ2/MQ3 = management / NRI / institutional; MSM = Muslim minority college;
 *  FEM marks women's seats (not modelled); PHO marks PwD seats. */
const tgSeat = (adm: string): [string, string] => {
  const t = adm.toUpperCase().split('-').slice(0, -1);
  const pwd = t.includes('PHO');
  if (/^MQ\d/.test(t[0])) return [t[0] === 'MQ2' ? 'NRI' : t[0] === 'MQ3' ? 'Institutional' : 'Management', 'Open'];
  const q = t[0] === 'S' ? 'In-service' : t[1] === 'MIN' ? 'Minority' : 'State Quota';
  const c = t[1] ?? 'OPEN';
  const seat = c === 'OPEN' || c === 'MIN' ? 'Open' : /^BC[A-E]$/.test(c) ? `BC-${c[2]}` : /^SC\d$/.test(c) ? 'SC' : c === 'ST' ? 'ST' : c === 'EWS' ? 'EWS' : c;
  return [q, seat + (pwd ? ' PwD' : '')];
};
const tgCandidate = (c: string) => (c === 'OC' ? 'General' : /^BC[A-E]$/.test(c) ? `BC-${c[2]}` : /^SC\d$/.test(c) ? 'SC' : c === 'BC' ? 'OBC' : c || 'Not stated');
const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Esi|Mnr|Cmr|Trr|Rvm|Dr V R K|Hyd|Sci|Med|Inst)\b/g, (m) => ({ Esi: 'ESI', Mnr: 'MNR', Cmr: 'CMR', Trr: 'TRR', Rvm: 'RVM', 'Dr V R K': 'Dr VRK', Hyd: 'Hyderabad', Sci: 'Sciences', Med: 'Medical', Inst: 'Institute of' } as Record<string, string>)[m] ?? m).replace(/Institute of Of/g, 'Institute of');
const TG_DIPLOMA: Record<string, string> = { DTCD: 'Diploma in Tuberculosis and Chest Diseases', DPH: 'Diploma in Public Health', DO: 'Diploma in Ophthalmology', DPM: 'Diploma in Psychiatry', DCH: 'Diploma in Child Health', DA: 'Diploma in Anaesthesiology', DGO: 'Diploma in Obstetrics and Gynaecology', DLO: 'Diploma in Otorhinolaryngology', DMRD: 'Diploma in Radiodiagnosis', DCP: 'Diploma in Clinical Pathology' };
const tgCourse = (c: string) => TG_DIPLOMA[c.trim().toUpperCase()] ?? c.replace(/\bDVL\b/i, 'Dermatology').replace(/^(MD|MS)\s*\((.*)\)$/i, '$1 $2').replace(/^(DIP|DIPLOMA)\s*\(?\s*(.*?)\)?$/i, 'Diploma in $2');
// Gujarat (ACPPGMEC): college code → MCC institute code (the government colleges that also have AIQ seats).
const GJ_CODES: Record<string, string> = { AMED: '700363', BMED: '700365', SMED: '700364', JMED: '700367', RMED: '700368', BHMED: '700369', IKDMED: '701501' };
const GJ_NAMES: Record<string, string> = { Jamkhambhaliya: 'General Hospital, Jamkhambhaliya' };
/** ACPPGMEC seat type → quota. UQ = university (institutional) quota for graduates of the same university. */
const GJ_QUOTA: Record<string, string> = { GQ: 'State Quota', UQ: 'University Quota', MQ: 'Management', NQ: 'NRI', IQ: 'In-service' };
const GJ_CATS: Record<string, string> = { OP: 'Open', SE: 'SEBC', EW: 'EWS', SC: 'SC', ST: 'ST', MQ: 'Open', NRI: 'Open' };
const gjSeat = (c: string) => { const pwd = /PH$/.test(c), b = c.replace(/PH$/, ''); return (GJ_CATS[b] ?? b) + (pwd ? ' PwD' : ''); };
const gjCourse = (c: string) => (/\(DNB\)$/.test(c) ? `(NBEMS) ${c.replace(/\s*\(DNB\)$/, '')}` : c);
// Madhya Pradesh (DME MP): institute name (letters only; 2025 lists glue words together) → [display name, MCC code].
// Private colleges are not in MCC PG counselling and have no code.
const MP_INST: Record<string, [string, string]> = {
  GANDHIMEDICALCOLLEGEBHOPAL: ['Gandhi Medical College, Bhopal', '700296'],
  GAJRARAJAMEDICALCOLLEGEGWALIOR: ['Gajra Raja Medical College, Gwalior', '700297'],
  MAHATMAGANDHIMEMORIALMEDICALCOLLEGEINDORE: ['Mahatma Gandhi Memorial Medical College, Indore', '700298'],
  NETAJISUBHASHCHANDRABOSEMEDICALCOLLEGEJABALPUR: ['Netaji Subhash Chandra Bose Medical College, Jabalpur', '700299'],
  SHYAMSHAHMEDICALCOLLEGEREWA: ['Shyam Shah Medical College, Rewa', '700300'],
  BUNDELKHANDMEDICALCOLLEGESAGAR: ['Bundelkhand Medical College, Sagar', '700520'],
  GOVERMENTMEDICALCOLLEGERATLAM: ['Dr Laxminarayan Pandey Government Medical College, Ratlam', '701513'],
  DRLAXMINARAYANPANDEYGOVERNMENTMEDICALCOLLEGERATLAM: ['Dr Laxminarayan Pandey Government Medical College, Ratlam', '701513'],
  GOVERNMENTMEDICALCOLLEGEDATIA: ['Government Medical College, Datia', '701709'],
  ATALBIHARIVAJPAYEEGOVERNMENTMEDICALCOLLEGEVIDISHA: ['Atal Bihari Vajpayee Government Medical College, Vidisha', '901807'],
  NANDKUMARSINGHCHOUHANGOVERNMENTMEDICALCOLLEGEKHANDWA: ['Nandkumar Singh Chouhan Government Medical College, Khandwa', '901861'],
  BIRSAMUNDAGOVERNMENTMEDICALCOLLEGESHAHDOL: ['Birsa Munda Government Medical College, Shahdol', '902851'],
  SHRIMANTRAJMATAVIJAYARAJESCINDIAMEDICALCOLLEGESHIVPURI: ['Shrimant Rajmata Vijayaraje Scindia Medical College, Shivpuri', '902838'],
  GOVERMENTMEDICALCOLLEGESATNA: ['Government Medical College, Satna', '904563'],
  CHHINDWARAINSTITUTEOFMEDICALSCIENCESCHHINDWARA: ['Chhindwara Institute of Medical Sciences, Chhindwara', '904566'],
  GWALIORMANSIKAROGYSHALAGWALIOR: ['Gwalior Mansik Arogyashala, Gwalior', '701715'],
  DHBHOPAL: ['JP District Hospital, Bhopal', '700914'], DISTRICTHOSPITALBHOPAL: ['JP District Hospital, Bhopal', '700914'],
  DHGWALIOR: ['District Hospital, Gwalior', '701554'], DHSAGAR: ['District Hospital, Sagar', '701568'], DHGUNA: ['District Hospital, Guna', '901695'],
  DHREWA: ['Kushabhau Thakre District Hospital, Rewa', '901727'], DHSATNA: ['Sardar Vallabh Bhai Patel District Hospital, Satna', '701477'],
  DHVIDISHA: ['Shrimant Madhavrao Scindia District Hospital, Vidisha', '701651'], DHSHIVPURI: ['District Hospital, Shivpuri', '904230'],
  CIVILHOSPITALJABALPUR: ['Civil Hospital, Jabalpur', ''],
  INDEXMEDICALCOLLEGEHOSPITALANDRESEARCHCENTERINDORE: ['Index Medical College Hospital and Research Center, Indore', ''],
  SRIAUROBINDOINSTITUTEOFMEDICALSCIENCEINDORE: ['Sri Aurobindo Institute of Medical Sciences, Indore', ''],
  LNMEDICALCOLLEGEBHOPAL: ['LN Medical College, Bhopal', ''],
  PEOPLESCOLLEGEOFMEDICALSCIENCEBHOPAL: ['Peoples College of Medical Sciences, Bhopal', ''],
  CHIRAYUMEDICALCOLLEGEANDHOSPITALBHOPAL: ['Chirayu Medical College and Hospital, Bhopal', ''],
  RDGARDIMEDICALCOLLEGEUJJAIN: ['RD Gardi Medical College, Ujjain', ''],
  AMALTASINSTITUTEOFMEDICALSCIENCESDEWAS: ['Amaltas Institute of Medical Sciences, Dewas', ''],
  RKDFMEDICALCOLLEGEHOSPITALANDRESEARCHCENTREBHOPAL: ['RKDF Medical College Hospital and Research Centre, Bhopal', ''],
  RAMKRISHNAMEDICALCOLLEGEHOSPITALANDRESEARCHCENTREBHOPAL: ['Ram Krishna Medical College Hospital and Research Centre, Bhopal', ''],
  SUKHSAGARMEDICALCOLLEGEANDHOSPITALJABALPUR: ['Sukh Sagar Medical College and Hospital, Jabalpur', ''],
  MAHAVEERINSTITUTEOFMEDICALSCIENCEANDRESEARCHBHOPAL: ['Mahaveer Institute of Medical Science and Research, Bhopal', ''],
  LNCTMEDICALCOLLEGESEWAKUNJHOSPITALINDORE: ['LNCT Medical College and Sewakunj Hospital, Indore', ''],
};
const mpKey = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '');
const MP_CAT: Record<string, string> = { UR: 'Open', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS' };
/** DME MP seat code "[INST|NON_INST/]CAT/HORIZONTAL/OP" (e.g. INST/OBC/X/OP, IN_UR/X/OP, INST/UR/NRI/OP) → [quota suffix, seat category].
 *  IN_ = in-service seat; INST = reserved for graduates of MP colleges; NON_INST or no prefix in a private college = open to all. */
const mpSeat = (code: string, instType: string): [string, string] => {
  const p = code.toUpperCase().split('/');
  const [pre, cat, hz] = p.length >= 4 ? [p[0], p[1], p[2]] : ['', p[0], p[1] ?? 'X'];
  const inService = cat.startsWith('IN_');
  const c = MP_CAT[cat.replace(/^IN_/, '')] ?? cat.replace(/^IN_/, ''), pwd = hz === 'PH' ? ' PwD' : '';
  if (inService) return ['In-service', c + pwd];
  if (hz === 'NRI') return ['NRI', 'Open'];
  if (/^govt/i.test(instType)) return ['State Quota', c + pwd];
  return [pre === 'INST' ? 'Private (MP graduates)' : 'Private (open to all)', c + pwd];
};
const mpCandidate = (code: string) => {
  const [cat, hz] = code.toUpperCase().split('/');
  const c = cat.replace(/^IN_/, '');
  return (c === 'UR' ? 'General' : MP_CAT[c] ?? c) + (hz === 'PH' ? ' PwD' : '');
};
const mpCourse = (course: string, subject: string) => {
  const s = subject.replace(/\s+/g, ' ').trim();
  if (/DNB/i.test(course)) return `(NBEMS) ${s}`;
  if (/DIP/i.test(course)) return `(NBEMS-DIPLOMA) ${s}`;
  return `${course.trim()} ${s}`;
};
// Haryana (DMER): college name (letters only) → [display name, MCC code].
const HR_INST: Record<string, [string, string]> = {
  panditbhagwatdayalsharmapgims: ['Pt BD Sharma PGIMS, Rohtak', '700374'],
  bhagatphoolsinghgmc: ['BPS Government Medical College for Women, Khanpur Kalan', '700378'],
  shkmgmcnalharnuh: ['SHKM Government Medical College, Nalhar (Nuh)', '700491'],
  esicfaridabad: ['ESIC Medical College & Hospital, Faridabad', '701500'],
  kcgmckarnal: ['Kalpana Chawla Government Medical College, Karnal', '701698'],
  generalhospitalpanchkulaharyana: ['General Hospital, Panchkula', '700724'],
  districtcivilhospitalmaharajaagarsenhisarharyana: ['Maharaja Agrasen District Civil Hospital, Hisar', '700738'],
  civilhospitalgurugramharyana: ['Civil Hospital, Gurugram', '701549'],
  civilhospitalfaridabadharyana: ['Civil Hospital, Faridabad', '700737'],
  civilhospitalpalwalharyana: ['Civil Hospital, Palwal', '701547'],
  civilhospitalambalacanttambalaharyana: ['Civil Hospital, Ambala Cantt', '701310'],
  civilhospitalrohtakharyana: ['Civil Hospital, Rohtak', '700744'],
  civilhospitalbahadurgarhjhajjarharyana: ['Civil Hospital, Bahadurgarh (Jhajjar)', '700740'],
  districtcivilhospitalambalacityambala: ['District Civil Hospital, Ambala City', '700739'],
  alafiacivilhospitalmandikheradistrtnuhmewatharyana: ['Al-Aafia Civil Hospital, Mandikhera (Nuh)', '701516'],
  generalhospitalpanipatharyana: ['General Hospital, Panipat', '700841'],
  districtcivilhospitalrewariharyana: ['District Civil Hospital, Rewari', '700745'],
  sgtmedicalcollegeresearchinstitutebudheragurugram: ['SGT Medical College & Research Institute, Gurugram', ''],
  maharajaagrasenmedicalcollege: ['Maharaja Agrasen Medical College, Agroha', ''],
  worldcollegeofmedsciresjhajjar: ['World College of Medical Sciences & Research, Jhajjar', ''],
  adeshmedicalcollegekurukshetra: ['Adesh Medical College, Kurukshetra', ''],
  alfalahuniversityfaridabad: ['Al-Falah School of Medical Sciences, Faridabad', ''],
  ncmedicalcollegeisranapanipat: ['NC Medical College, Israna (Panipat)', ''],
};
const HR_CAT: Record<string, string> = { UR: 'Open', BCA: 'BC-A', BCB: 'BC-B', SC: 'SC', SCD: 'SC (Deprived)', EWS: 'EWS' };
/** "UR IP IS PWD", "BCA IS", "Mgmt" … → [quota suffix, seat category]. IS = in-service (Haryana Govt doctors);
 *  IP = institutional preference (MBBS from a Haryana college); ESM/FF (ex-servicemen / freedom fighter wards) not modelled. */
const hrSeat = (code: string): [string, string] => {
  const t = code.toUpperCase().replace(/^-/, '').split(/\s+/); // 2024 R2 prints a few seats as "-UR" / "-BCB"
  if (t[0] === 'MGMT') return ['Management', 'Open'];
  if (t[0] === 'NRI') return ['NRI', 'Open'];
  if (t[0] === 'MINORITY') return ['Minority', 'Open'];
  const seat = (HR_CAT[t[0]] ?? t[0]) + (t.includes('PWD') ? ' PwD' : '');
  return [t.includes('IS') ? 'In-service' : t.includes('IP') ? 'State Quota (institutional preference)' : 'State Quota', seat];
};
const hrCourse = (c: string) => c.replace(/^Post MBBS DNB\s*-\s*/i, '(NBEMS) ').replace(/^Post MBBS Diploma\s*-\s*/i, '(NBEMS-DIPLOMA) ').replace(/^(MD|MS)\s*-\s*/, '$1 ');
// Bihar (BCECEB): institute (letters only) → [display name, MCC code]. Private colleges have no MCC code.
const BH_INST: Record<string, [string, string]> = {
  PMCPATNA: ['Patna Medical College, Patna', '700480'], NMCPATNA: ['Nalanda Medical College, Patna', '700109'],
  IGIMSPATNA: ['Indira Gandhi Institute of Medical Sciences, Patna', '700111'], DMCLAHERIASARAI: ['Darbhanga Medical College, Laheriasarai', '700107'],
  SKMCMUZAFFARPUR: ['Sri Krishna Medical College, Muzaffarpur', '700113'], JLNMCBHAGALPUR: ['Jawaharlal Nehru Medical College, Bhagalpur', '700112'],
  ANMMCGAYA: ['Anugrah Narayan Magadh Medical College, Gaya', '700272'], BMIMSPAWAPURINALANDA: ['Bhagwan Mahavir Institute of Medical Sciences, Pawapuri', '700541'],
  GMCBETTIAH: ['Government Medical College, Bettiah', '701505'],
  KMCKATIHAR: ['Katihar Medical College, Katihar', ''], MADHUBANIMEDICALCOLLEGEMADHUBANI: ['Madhubani Medical College, Madhubani', ''],
  MGMMCLSKHOSKISHANGANJ: ['MGM Medical College & LSK Hospital, Kishanganj', ''], NMCHSASARAM: ['Narayan Medical College & Hospital, Sasaram', ''],
  NETAJISUBHASMEDICALCOLLEGEHOSPITAL: ['Netaji Subhas Medical College & Hospital, Bihta', ''],
  LORDBUDHAKOSHIMEDICALCOLLEGEHOSPITALSAHARSA: ['Lord Buddha Koshi Medical College & Hospital, Saharsa', ''],
  SHRINARAYANMEDICALINSTITUTEANDHOSPITALSAHARSA: ['Shri Narayan Medical Institute & Hospital, Saharsa', ''],
  RDJMMEDICALCOLLEGEANDHOSPITALTURKIMUZAFFARPUR: ['RDJM Medical College & Hospital, Turki (Muzaffarpur)', ''],
};
const BH_CAT: Record<string, string> = { UR: 'Open', BC: 'BC', EBC: 'EBC', EWS: 'EWS', SC: 'SC', ST: 'ST', RCG: 'BC Women (RCG)' };
/** BCECEB allotted category → [quota suffix, seat category]. MM / SM = Muslim / Sikh minority seats; DQ seats sit inside a vertical category. */
const bhSeat = (cat: string, inst: [string, string] | undefined): [string, string] => {
  const c = cat.toUpperCase().replace(/^DQ-?/, '') || 'UR';
  if (c === 'NRI') return ['NRI', 'Open'];
  if (c === 'MM' || c === 'SM') return ['Minority', 'Open'];
  return [inst?.[1] ? 'State Quota' : 'Private (state quota)', BH_CAT[c] ?? c];
};
const bhCourse = (type: string, b: string) => (/^DIPLOMA/i.test(type) ? MH_DIPLOMA[b] ?? `Diploma ${b.replace(/^DIP\.?/i, '').replace(/^P\.M\.R\.?$/i,'Physical Medicine and Rehabilitation')}` : `MD/MS ${({ 'F.M.T.': 'Forensic Medicine', RADIOONCOLOGY: 'Radiation Oncology' } as Record<string, string>)[b] ?? b}`);
// Punjab (BFUHS): the list cells often repeat or pick up text from the row above, so a college is the longest of these
// name keys found inside the cell's letters. [key, display name, MCC code, government?]
const PB_INST: [string, string, string, boolean][] = [
  ['governmentmedicalcollegepatiala', 'Government Medical College, Patiala', '700339', true],
  ['governmentmedicalcollegeamritsar', 'Government Medical College, Amritsar', '700341', true],
  ['gurugobindsinghmedicalcollegefaridkot', 'Guru Gobind Singh Medical College, Faridkot', '700342', true],
  ['drbrambedkarstateinstitute', 'Dr BR Ambedkar State Institute of Medical Sciences, Mohali', '903369', true],
  ['netajisubhasnationalinstituteofsports', 'Netaji Subhas National Institute of Sports, Patiala', '700344', true],
  ['homibhabhacancerhospital', 'Homi Bhabha Cancer Hospital, Sangrur', '701509', true],
  ['instituteofmentalhealth', 'Institute of Mental Health, Amritsar', '701014', true],
  ['sblscivilhospital', 'SBLS Civil Hospital, Jalandhar', '701025', true], ['jbmmdistricthospital', 'JBMM District Hospital, Amritsar', '701024', true],
  ['matakaushalya', 'Mata Kaushalya Government Hospital, Patiala', '701021', true], ['lordmahavircivilhospital', 'Lord Mahavir Civil Hospital, Ludhiana', '701020', true],
  ['shaheedbhaimanisingh', 'Shaheed Bhai Mani Singh District Hospital, Bathinda', '701027', true],
  ['districthospitalfaridkot', 'District Hospital, Faridkot', '701561', true], ['civilhospitalgurdaspur', 'Civil Hospital, Gurdaspur', '901690', true],
  ['civilhospitalkapurthala', 'Civil Hospital, Kapurthala', '901845', true], ['civilhospitalmalerkotla', 'Civil Hospital, Malerkotla', '904218', true],
  ['civilhospitalropar', 'Civil Hospital, Ropar', '904220', true], ['disricthospitalfatehgarhsahib', 'District Hospital, Fatehgarh Sahib', '901700', true],
  ['disricthospitalmainbazaarmoga', 'District Hospital, Moga', '904229', true], ['disricthospitaltarntaran', 'District Hospital, Tarn Taran', '904228', true],
  ['districthospitalnawanshahar', 'District Hospital, Nawanshahr', '', true], ['districthospitalphasesasnagar', 'District Hospital, SAS Nagar (Mohali)', '901699', true],
  ['sdhrajpura', 'Sub-Divisional Hospital, Rajpura', '904327', true],
  ['srigururamdasinstitute', 'Sri Guru Ram Das Institute of Medical Sciences and Research, Amritsar', '', false],
  ['dayanandmedicalcollege', 'Dayanand Medical College and Hospital, Ludhiana', '', false],
  ['christianmedicalcollegeludhiana', 'Christian Medical College, Ludhiana', '', false],
  ['christianmedicalcollegehospitalludhiana', 'Christian Medical College, Ludhiana', '', false],
  ['civilhospitaljalandharroadhoshiarpur', 'Civil Hospital, Hoshiarpur', '901691', true], ['civilhospitalpathankot', 'Civil Hospital, Pathankot', '901692', true],
  ['civilhospitalbarnala', 'Civil Hospital, Barnala', '901846', true], ['disricthospitalfazilka', 'District Hospital, Fazilka', '904226', true],
  ['adeshinstituteofmedicalsciences', 'Adesh Institute of Medical Sciences & Research, Bathinda', '', false],
  ['giansagarmedicalcollege', 'Gian Sagar Medical College & Hospital, Banur', '', false],
];
// bold cells come out with doubled glyphs ("GGoovveerrnnmmeenntt", "MMeeddiicacall"); collapse repeats on both sides before matching
const pbNorm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1').replace(/(..)\1+/g, '$1').replace(/inst(?!itute)of/g, 'instituteof');
const pbInst = (cell: string) => {
  const k = pbNorm(cell);
  return PB_INST.filter(([key]) => k.includes(pbNorm(key))).sort((a, b) => b[0].length - a[0].length)[0];
};
const PB_CAT: [RegExp, string][] = [[/^ews/i, 'EWS'], [/scheduled\s*caste/i, 'SC'], [/backward/i, 'BC'], [/./, 'Open']];
/** BFUHS quota + category → [quota suffix, seat category]. PCMS doctors (incentive marks on the state merit list) get
 *  their own quota; IP = institutional preference (MBBS from a Punjab university). */
const pbSeat = (quota: string, cat: string, govt: boolean, inService: boolean): [string, string] => {
  const seat = PB_CAT.find(([re]) => re.test(cat.trim()))![1], q = quota.toLowerCase();
  if (/nri/.test(q)) return ['NRI', 'Open'];
  if (/management/.test(q)) return ['Management', 'Open'];
  if (/minority|^[ab]$/.test(q)) return ['Minority', 'Open'];
  if (/open\s*merit/.test(q)) return ['Private (open to all)', seat];
  if (inService) return ['In-service (incentive marks)', seat];
  const base = govt ? 'State Quota' : 'Private (state quota)';
  return [/\bIP\b|\(IP\)/.test(cat) ? `${base} (institutional preference)` : base, seat];
};
const PB_SHORT: Record<string, string> = { DA: 'Diploma in Anaesthesiology', DCH: 'Diploma in Child Health', PGDSM: 'Diploma in Sports Medicine' };
const pbCourse = (c: string) => {
  const [prog, raw] = c.split('|');
  // doubled bold glyphs ("_PPaaeeddiiaattrriicscs") → collapse repeats
  const name = /(.)\1(.)\2(.)\3/.test(raw ?? '') ? raw.replace(/(.)\1/g, '$1').replace(/(..)\1/g, '$1').replace(/^_+/, '') : raw;
  if (PB_SHORT[name]) return PB_SHORT[name];
  if (prog === 'PGDiploma') return `Diploma ${name}`;
  if (/^PostGraduationDiploma/i.test(name)) return `Diploma ${name.replace(/^PostGraduationDiplomain/i, '')}`;
  return prog === 'DNB' ? `(NBEMS) ${name}` : prog === 'Diploma' ? `(NBEMS-DIPLOMA) ${name}` : `MD/MS ${name}`;
};
// Chhattisgarh (DME CG): name key found in the institute cell → [display name, MCC code, government?].
const CG_INST: [string, string, string, boolean][] = [
  ['jawaharlalnehrumemorial', 'Pt JNM Medical College, Raipur', '700316', true],
  ['chhattisgarhinstituteofmedicalsciences', 'Chhattisgarh Institute of Medical Sciences, Bilaspur', '700319', true],
  ['lakhiramagrawal', 'Late Shri Lakhiram Agrawal Memorial Government Medical College, Raigarh', '700534', true],
  ['baliramkashyap','Late Baliram Kashyap Memorial Government Medical College, Jagdalpur', '700538', true],
  ['atalbiharivajpayee', 'Bharat Ratna Late Shri Atal Bihari Vajpayee Memorial Medical College, Rajnandgaon', '701498', true],
  ['devendrakumarisinghdeo', 'Rajmata Smt Devendra Kumari Singhdeo Government Medical College, Ambikapur', '701708', true],
  ['bisahudasmahant', 'Late Bisahu Das Mahant Memorial Medical College, Korba', '904557', true],
  ['shribalajiinstitute', 'Shri Balaji Institute of Medical Science, Raipur', '', false],
  ['shankaracharya', 'Shri Shankaracharya Institute of Medical Sciences, Bhilai', '', false],
  ['raipurinstituteofmedicalsciences', 'Raipur Institute of Medical Sciences, Raipur', '', false],
];
const cgInst = (cell: string) => { const k = cell.toLowerCase().replace(/[^a-z]/g, ''); return CG_INST.find(([key]) => k.includes(key)); };
const CG_CAT: Record<string, string> = { UR: 'Open', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS' };
/** "State Institutional Quota" = MBBS from a Chhattisgarh college; "State Open Quota" = open to other candidates too.
 *  In-service doctors (bonus marks) get their own quota. Female-reserved seats are shown with their category. */
const cgSeat = (quota: string, cat: string, govt: boolean, inService: boolean): [string, string] => {
  const q = quota.replace(/\s+/g, '').toLowerCase(), c = CG_CAT[cat.split('-')[0].toUpperCase()] ?? cat;
  if (q.startsWith('nri') || q === 'nr') return ['NRI', 'Open'];
  if (inService) return ['In-service (bonus marks)', c];
  const base = govt ? 'State Quota' : 'Private (state quota)';
  if (q === 'gq') return [base, c]; // 2024 lists: one government quota, before the institutional/open split
  if (q.startsWith('mgmt')) return ['Management', c];
  return [q.includes('open') ? `${base} (open)` : `${base} (institutional)`, c];
};
const cgCourse = (p: string) => (/\bPMR\b/i.test(p) ? 'MD Physical Medicine & Rehabilitation' : /DERM|SKIN|VENE/i.test(p) ? 'MD Dermatology' : p);
// Himachal Pradesh (AMRU): name key in the institute cell → [display name, MCC code, government?].
const HP_INST: [string, string, string, boolean][] = [
  ['indiragandhimedicalcollegeshimla', 'Indira Gandhi Medical College, Shimla', '700379', true],
  ['rajendraprasad', 'Dr Rajendra Prasad Government Medical College, Tanda (Kangra)', '700380', true],
  ['lalbahadurshastri', 'Shri Lal Bahadur Shastri Government Medical College, Ner Chowk (Mandi)', '700748', true],
  ['radhakrishanan', 'Dr Radhakrishnan Government Medical College, Hamirpur', '700750', true],
  ['yashwantparmar', 'Dr Yashwant Singh Parmar Government Medical College, Nahan', '901862', true],
  ['jawaharlalnehru', 'Pt Jawahar Lal Nehru Government Medical College, Chamba', '904567', true],
  ['maharishimarkandeshwar', 'Maharishi Markandeshwar Medical College, Kumarhatti (Solan)', '', false],
];
const hpInst = (cell: string) => { const k = cell.toLowerCase().replace(/[^a-z]/g, ''); return HP_INST.find(([key]) => k.includes(key)); };
/** AMRU admission type + category → [quota suffix, seat category]. In-service doctors get incentive marks on the merit list. */
const hpSeat = (type: string, cat: string): [string, string] => {
  const t = type.replace(/\s+/g, '').toLowerCase(), c = cat.replace(/\s+/g, '').toLowerCase();
  const seat = /^sc/.test(c) ? 'SC' : /^st/.test(c) ? 'ST' : /economic/.test(c) ? 'EWS' : /obc|backward/.test(c) ? 'OBC' : /physically/.test(c) ? 'Open PwD' : 'Open';
  if (/nri/.test(t)) return ['NRI', 'Open'];
  if (/management/.test(t)) return ['Management', seat];
  if (/in-?service/.test(t)) return ['In-service (incentive marks)', seat];
  return ['State Quota', seat];
};
// Jammu & Kashmir (JKBOPEE): institute code → [display name, MCC code].
const JK_INST: Record<string, [string, string]> = {
  'GMC-SRINAGAR': ['Government Medical College, Srinagar', '701703'], 'GMC-JAMMU': ['Government Medical College, Jammu', '701706'],
  'SKIMS-SRINAGAR': ['Sher-i-Kashmir Institute of Medical Sciences, Srinagar', '701711'], 'GMC-ANANTNAG': ['Government Medical College, Anantnag', '904588'],
  'GMC-BARAMULLA': ['Government Medical College, Baramulla', '904589'], 'GMC-RAJOURI': ['Government Medical College, Rajouri', '904633'],
  'GMC-KATHUA': ['Government Medical College, Kathua', '904634'], 'ASCOMS-JAMMU': ['Acharya Shri Chander College of Medical Sciences (ASCOMS), Jammu', ''],
};
/** JKBOPEE reservation codes. RBA = residents of backward areas; ALC = actual line of control / international border;
 *  ST-1 / ST-2 are the two scheduled-tribe groups; STK / STL are left as printed (meaning not stated in the lists). */
const JK_CAT: Record<string, string> = { OM: 'Open', OMSP: 'Open', SC: 'SC', OBC: 'OBC', EWS: 'EWS', RBA: 'RBA', ALC: 'ALC/IB', ST1: 'ST-1', STI: 'ST-1', ST2: 'ST-2', STII: 'ST-2' };
const jkCat = (c: string) => JK_CAT[c.toUpperCase().replace(/[^A-Z0-9]/g, '')] ?? c;
const jkSeat = (sli: string, inst: string, inService: boolean): [string, string] => {
  const c = sli.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c === 'NRI') return ['NRI', 'Open'];
  if (c === 'HM') return ['Minority (Hindu)', 'Open'];
  if (inService) return ['In-service (bonus marks)', jkCat(sli)];
  return [/ASCOMS/i.test(inst) ? 'Private (state quota)' : 'State Quota', jkCat(sli)];
};
const jkCourse = (c: string) => c.replace(/^(MD|MS)\s*\/\s*(MD|MS)\s*/i, 'MD/MS ').replace(/^PG\s*Diploma\s*/i, 'Diploma ').replace(/^(MD|MS)(?=[A-Z])/, '$1 ').replace(/\bPediatric/i, 'Paediatric');
// Uttar Pradesh (DGME UP): institute code on upneet.gov.in → MCC code (Government / AIQ code). Private colleges are not in MCC.
const UP_CODES: Record<string, string> = {
  '001': '903368', '002': '902829', '003': '902835', '005': '904571', '006': '902834', '007': '904573', '008': '902830', '009': '904583',
  '010': '902832', '011': '904568', '012': '700329', '013': '700385', '014': '905699', '015': '902839', '016': '902833', '017': '701510',
  '018': '902837', '019': '701515', '020': '701514', '021': '701694', '022': '701503', '023': '700384', '024': '700366', '025': '700370',
  '026': '700372', '027': '700373', '028': '700527', '029': '700381', '030': '700376', '031': '700375', '032': '700377', '067': '904586',
  '068': '904635', '069': '904636',
};
/** UP seat codes = category + sub-category: UR/EW/BC/SC/ST + OP (open) / PH (PwD). BS / SS appear only on diploma seats
 *  taken by BC / SC candidates and are treated as OBC / SC. Candidate codes OB / OE / OS = reserved category from another
 *  state, which UP counts as General. */
const UP_CAT: Record<string, string> = { UR: 'Open', EW: 'EWS', BC: 'OBC', BS: 'OBC', SC: 'SC', SS: 'SC', ST: 'ST' };
const upSeat = (c: string) => (UP_CAT[c.slice(0, 2)] ?? c.slice(0, 2)) + (c.slice(2) === 'PH' ? ' PwD' : '');
const upCand = (c: string) => (/^(UR|OB|OE|OS)/.test(c) ? 'General' : upSeat(c)) + (/^UR/.test(c) && c.endsWith('PH') ? ' PwD' : '');
const UP_DIPLOMA: Record<string, string> = { DA: 'D.A.', DCH: 'D.C.H.', DGO: 'D.G.O.', 'D ORTH': 'D.ORTHO', DMRD: 'D.M.R.D.', DVD: 'D.V.D.', DLO: 'D.L.O.' };
const upCourse = (c: string) => UP_DIPLOMA[c] ? MH_DIPLOMA[UP_DIPLOMA[c]] : c.replace(/^(MD|MS) /, 'MD/MS ').replace('TRANSFUISION', 'TRANSFUSION').replace(/\bENT\b/, 'OTORHINOLARYNGOLOGY').replace(/\bANAESTHESIA\b/, 'ANAESTHESIOLOGY');
// Assam (DME Assam): college code in the select list → MCC code.
const AS_CODES: Record<string, string> = { '01': '700282', '02': '700283', '03': '700286', '04': '700294', '05': '700522', '06': '700511', '07': '700292', '08': '904585' };
/** Assam quotas: UR / OBC/MOBC(NCL) / SC / ST(P) (plains) / ST(H) (hills) / EWS; SHQ = State Health service (in-service) quota. */
const AS_CAT: Record<string, string> = { UR: 'Open', 'OBC/MOBC(NCL)': 'OBC', 'OBC/MOBC': 'OBC', SC: 'SC', 'ST(P)': 'ST (Plains)', 'ST(H)': 'ST (Hills)', EWS: 'EWS', General: 'Open' };
const asCourse = (c: string) => ({ 'DIPLOMA PAEDIATRICS (D.C.H.)': 'Diploma in Child Health', 'DIPLOMA ANAESTHESIOLOGY': 'Diploma in Anaesthesiology', 'MD RADIO-THERAPY': 'MD/MS RADIATION ONCOLOGY' } as Record<string, string>)[c] ?? c.replace(/^(MD|MS) /, 'MD/MS ');
// Odisha (PG Medical Counselling Committee): college as printed → [display name, MCC code]. Hi-Tech colleges are private.
const OD_INST: Record<string, [string, string]> = {
  'SCB MCH CUTTACK': ['SCB Medical College, Cuttack', '700336'], 'MKCG MCH BERHAMPUR': ['MKCG Medical College, Berhampur', '700335'],
  'VIMSAR BURLA': ['VIMSAR, Burla', '700338'], 'PGIMER BHUBANESWAR': ['PGIMER & Capital Hospital, Bhubaneswar', '701713'],
  'S J MCH PURI': ['Shri Jagannath Medical College & Hospital, Puri', '904332'], 'AHPGIC, CUTTACK': ['Acharya Harihar Post Graduate Institute of Cancer, Cuttack', '701714'],
  'HI-TECH MCH BHUBANESWAR': ['Hi-Tech Medical College & Hospital, Bhubaneswar', ''], 'HI-TECH MCH ROURKELA': ['Hi-Tech Medical College & Hospital, Rourkela', ''],
};
const OD_CAT: Record<string, string> = { UR: 'Open', SC: 'SC', ST: 'ST', PH: 'Open PwD', GCH: 'Green Card Holder', ES: 'Ex-servicemen ward', SEBC: 'SEBC', EWS: 'EWS' };
const odCand = (c: string) => (/^General/.test(c) ? 'General' : /^OBC/.test(c) ? 'SEBC' : c);
const odCourse = (s: string, t: string) => {
  const n = ({ 'GEN MEDICINE': 'GENERAL MEDICINE', 'GEN SURGERY': 'GENERAL SURGERY', 'RESP MEDICINE': 'RESPIRATORY MEDICINE', 'COMM MEDICINE': 'COMMUNITY MEDICINE', 'OBST AND GYNE': 'OBSTETRICS & GYNAECOLOGY', PEDIATRICS: 'PAEDIATRICS', ANESTHESIOLOGY: 'ANAESTHESIOLOGY' } as Record<string, string>)[s] ?? s;
  return t === 'DNB' ? `(NBEMS) ${n}` : `MD/MS ${n}`;
};
// West Bengal (WBMCC, read by OCR): name key (letters, "OE" OCR slips fixed) → [display name, MCC code, government?].
const WB_INST: [string, string, string, boolean][] = [
  ['INSTITUTEOFPOSTGRADUATEMEDICALEDUCATION', 'IPGME&R and SSKM Hospital, Kolkata', '700387', true], ['MEDICALCOLLEGEKOLKATA', 'Medical College, Kolkata', '700392', true],
  ['RGKAR', 'R G Kar Medical College, Kolkata', '700395', true], ['NILRATANSIRCAR', 'Nil Ratan Sircar Medical College, Kolkata', '700400', true],
  ['CALCUTTANATIONAL', 'Calcutta National Medical College, Kolkata', '700398', true], ['BURDWAN', 'Burdwan Medical College', '700388', true],
  ['BANKURA', 'Bankura Sammilani Medical College', '700402', true], ['NORTHBENGAL', 'North Bengal Medical College', '700393', true],
  ['MIDNAPORE', 'Midnapore Medical College', '700412', true], ['MURSHIDABAD', 'Murshidabad Medical College', '700537', true],
  ['MALDA', 'Malda Medical College', '700542', true], ['SAGOREDUTTA', 'College of Medicine & Sagore Dutta Hospital, Kolkata', '700521', true],
  ['JNMHOSPITALKALYANI', 'College of Medicine & JNM Hospital, Kalyani', '701353', true], ['ESIPGIMSR', 'ESI-PGIMSR & ESIC Medical College, Joka', '700543', true],
  ['SCHOOLOFTROPICAL', 'School of Tropical Medicine, Kolkata', '700397', true], ['ALLINDIAINSTITUTEOFHYGIENE', 'All India Institute of Hygiene and Public Health, Kolkata', '700404', true],
  ['DRBCROY', 'Dr BC Roy Post Graduate Institute of Paediatric Sciences, Kolkata', '700409', true], ['INSTITUTEOFCHILDHEALTH', 'Institute of Child Health, Kolkata', '700390', true],
  ['CHITTARANJANSEVASADAN', 'Chittaranjan Seva Sadan, Kolkata', '701299', true], ['DIAMONDHARBOUR', 'Diamond Harbour Government Medical College', '701289', true],
  ['RAMPURHAT', 'Rampurhat Government Medical College', '701347', true], ['TAMRALIPTO', 'Tamralipto Government Medical College', '902784', true],
  ['MAHARAJAJITENDRANARAYAN', 'Maharaja Jitendra Narayan Medical College, Cooch Behar', '701551', true], ['JALPAIGURI', 'Jalpaiguri Government Medical College', '', true],
  ['BARASAT', 'Barasat Government Medical College', '', true], ['INFECTIOUSDISEASES', 'Infectious Diseases & Beliaghata General Hospital, Kolkata', '901717', true],
  ['MRBANGUR', 'MR Bangur Hospital, Kolkata', '701261', true], ['ASANSOLDISTRICT', 'Asansol District Hospital', '701275', true],
  ['DISTRICTHOSPITALHOWRAH', 'District Hospital, Howrah', '701274', true], ['DISTRICTHOSPITALNADIA', 'District Hospital, Nadia (Krishnanagar)', '701272', true],
  ['DISTRICTHOSPITALALIPURDUAR', 'District Hospital, Alipurduar', '701397', true], ['KALNASD', 'Kalna SD & SS Hospital', '701601', true],
  ['COMMANDHOSPITAL', 'Command Hospital (Eastern Command), Kolkata', '', true],
  ['IMAMBARADISTRICT', 'Imambara District Hospital, Chinsurah', '701270', true], ['DEBENMAHATO', 'Deben Mahato Sadar Hospital, Purulia', '701273', true],
  ['SILIGURIDISTRICT', 'Siliguri District Hospital', '701281', true], ['RAIGANJ', 'Raiganj Government Medical College & Hospital', '701470', true],
  ['SURISADAR', 'Suri Sadar Hospital', '701280', true], ['WALSH', 'Walsh Sub-Divisional Hospital, Serampore', '', true],
  ['SREEBALARAMSEVAMANDIR', 'Sree Balaram Seva Mandir SG Hospital', '701298', true], ['DRBNBOSE', 'Dr BN Bose Sub-Divisional Hospital', '701292', true],
  ['VIDYASAGARSTATEGENERAL', 'Vidyasagar State General Hospital', '701296', true], ['JANGIPUR', 'Jangipur Sub-Divisional Hospital', '701444', true],
  ['LALBAGH', 'Lalbagh Sub-Divisional Hospital', '701451', true], ['CHANDANNAGAR', 'Chandannagar Sub-Divisional Hospital', '701295', true],
  ['PRAFULLACHANDRASEN', 'Prafulla Chandra Sen Government Medical College, Arambagh', '', true], ['ISLAMPURSUBDIVISIONAL', 'Islampur Sub-Divisional Hospital', '', true],
  ['KPCMEDICAL', 'KPC Medical College, Kolkata', '', false], ['IQCITY', 'IQ City Medical College, Durgapur', '', false],
  ['GOURIDEVI', 'Gouri Devi Institute of Medical Sciences, Durgapur', '', false], ['JAGANNATHGUPTA', 'Jagannath Gupta Institute of Medical Sciences, Budge Budge', '', false],
  ['RAMAKRISHNAMISSION', 'Ramakrishna Mission Seva Pratishthan, Kolkata', '', false], ['RAMKRISHNAMISSIONSEVA', 'Ramakrishna Mission Seva Pratishthan, Kolkata', '', false], ['SHRRAMKRISHNA', 'Shri Ramkrishna Institute of Medical Sciences & Sanaka Hospitals, Durgapur', '', false],
  ['ICAREINSTITUTE', 'ICARE Institute of Medical Sciences & Research, Haldia', '', false], ['JISSCHOOL', 'JIS School of Medical Science & Research, Howrah', '', false],
];
const wbKey = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '').replace(/OE(?=(MEDICAL|POST|CHILD|HYGIENE|PAED|TROPICAL))/g, 'OF').replace(/GOUR[IL]DEV[IL]/, 'GOURIDEVI').replace(/SHR[IL]RAM/, 'SHRRAM');
const wbInst = (s: string) => { const k = wbKey(s); return WB_INST.find(([key]) => k.includes(key)); };
const wbCat = (c: string) => { const s = c.replace(/\s+/g, ' ');
  const base = /^UR|^General/i.test(s) ? 'Open' : /^OBC-A/i.test(s) ? 'OBC-A' : /^OBC-B/i.test(s) ? 'OBC-B' : /^OBC/i.test(s) ? 'OBC' : /^EWS/i.test(s) ? 'EWS' : /^SC/i.test(s) ? 'SC' : /^ST/i.test(s) ? 'ST' : s;
  return base + (/PwD/i.test(s) ? ' PwD' : ''); };
const WB_SPEC: [RegExp, string][] = [
  [/ANAESTH/, 'ANAESTHESIOLOGY'], [/GENERALMEDICINE|^MD\(?GENERAL$/, 'GENERAL MEDICINE'], [/GENERALSURGERY/, 'GENERAL SURGERY'], [/PAEDIATRIC|CHILDHEALTH/, 'PAEDIATRICS'],
  [/RADIO-?DIAGNOSIS/, 'RADIODIAGNOSIS'], [/RADIOTHERAPY|RADIATIONONCOLOGY/, 'RADIATION ONCOLOGY'], [/OPHTHALMOLOGY/, 'OPHTHALMOLOGY'], [/GYNAE|OBSTETRIC/, 'OBSTETRICS & GYNAECOLOGY'],
  [/ORTHOPAEDIC/, 'ORTHOPAEDICS'], [/E\.?N\.?T|OTORHINO/, 'OTORHINOLARYNGOLOGY'], [/PATHOLOGY/, 'PATHOLOGY'], [/PSYCHIATRY/, 'PSYCHIATRY'], [/COMMUNITY|PREVENTIVE/, 'COMMUNITY MEDICINE'],
  [/RESPIRATORY|TUBERCULOSIS|PULMONA/, 'RESPIRATORY MEDICINE'], [/PHARMACOLOGY/, 'PHARMACOLOGY'], [/DERM|VENEREOLOGY/, 'DERMATOLOGY, VENEREOLOGY & LEPROSY'], [/MICROBIOLOGY/, 'MICROBIOLOGY'],
  [/BIOCHEMISTRY/, 'BIOCHEMISTRY'], [/PHYSIOLOGY/, 'PHYSIOLOGY'], [/TRANSFUSION|IMMUNO/, 'IMMUNOHAEMATOLOGY & BLOOD TRANSFUSION'], [/PHYSICALMED|REHABILITATION/, 'PHYSICAL MEDICINE & REHABILITATION'],
  [/FORENSIC/, 'FORENSIC MEDICINE'], [/GERIATRIC/, 'GERIATRICS'], [/ANATOMY/, 'ANATOMY'],
];
const wbCourse = (c: string) => {
  const k = c.toUpperCase().replace(/\s+/g, ''), spec = WB_SPEC.find(([re]) => re.test(k))?.[1];
  if (!spec) return c;
  if (/^\(NBEMS/.test(k)) return `(NBEMS) ${spec}`;
  if (/^DIP/.test(k)) return ({ 'OBSTETRICS & GYNAECOLOGY': 'Diploma in Obstetrics and Gynaecology', OPHTHALMOLOGY: 'Diploma in Ophthalmology', PAEDIATRICS: 'Diploma in Child Health', ANAESTHESIOLOGY: 'Diploma in Anaesthesiology' } as Record<string, string>)[spec] ?? `Diploma in ${spec}`;
  return `MD/MS ${spec}`;
};
const STATE_FILES = readdirSync('data/parsed').filter((f) => /^(mh|ka|kl|ap|rj|tg|gj|mp|hr|bh|pb|cg|hp|jk|ga|up|as|od|wb|tn)20\d\d_[a-z0-9_]+\.json$/.test(f) && !/merit|_oc$/.test(f)).map((f) => f.replace('.json', ''));

// ---- rounds ----
const files = readdirSync('data/parsed').filter((f) => /^mcc20\d\d_[a-z0-9]+\.json$/.test(f)).map((f) => f.replace('.json', ''))
  .filter((f) => SOURCES[f]);
type RoundInfo = { id: string; year: number; label: string; url: string; count: number; counselling: string; kind?: string };
const rounds: RoundInfo[] = [
  ...files.map((f) => ({ id: f, year: Number(f.slice(3, 7)), label: SOURCES[f][0], url: U + SOURCES[f][1], count: 0, counselling: 'MCC' })),
  ...STATE_FILES.map((f) => { const d = load(`data/parsed/${f}.json`); return { id: f, year: d.year, label: d.round, url: d.url, count: 0, counselling: d.counselling, ...(d.kind ? { kind: d.kind } : {}) }; }),
].sort((a, b) => a.year - b.year || (a.counselling === 'MCC' ? 0 : 1) - (b.counselling === 'MCC' ? 0 : 1) || a.counselling.localeCompare(b.counselling)
  || ROUND_ORDER.indexOf(a.label) - ROUND_ORDER.indexOf(b.label));
const rows: number[] = [];
// yearly tuition fee per (institute, course, quota) from state sources; the latest year wins
const fees = new Map<string, { fee: number; year: number; src: string }>();
const setFee = (ii: number, ci: number, qi: number, fee: number, year: number, src: string) => {
  const k = `${ii}.${ci}.${qi}`, cur = fees.get(k);
  if (!cur || year >= cur.year) fees.set(k, { fee, year, src });
};
const unknownMp = new Set<string>();
for (const rd of rounds.filter((x) => x.counselling === 'Rajasthan')) for (const r of load(`data/parsed/${rd.id}.json`).rows) {
  const nk = r.institute.toLowerCase().replace(/[^a-z]/g, ''), cur = rjBest.get(nk);
  if (!cur || (r.institute.match(/ /g)?.length ?? 0) > (cur.match(/ /g)?.length ?? 0)) rjBest.set(nk, r.institute);
}
rounds.forEach((rd, ri) => {
  const d = load(`data/parsed/${rd.id}.json`);
  for (const r of d.rows) {
    if (rd.counselling === 'Maharashtra') {
      const code = MH_CODES[r.institute] ?? '';
      const ii = instIndex(`MH ${r.institute}`, rd.year, { display: code ? codeName(code) : r.institute.replace(/\s+/g, ' '), code, state: 'Maharashtra' });
      const [q, seat] = mhSeat(r.allottedCategory);
      rows.push(ri, r.rank, ii, course.get(normCourse(MH_DIPLOMA[r.course] ?? r.course)), quota.get(`Maharashtra ${q}`), acat.get(seat), ccat.get(mhCandidate(r.candidateCategory)), r.page);
      continue;
    }
    if (rd.counselling === 'Goa') {
      const ii = instIndex('GA GMC', rd.year, { display: 'Goa Medical College, Bambolim', code: '700479', state: 'Goa' });
      const c = r.allottedCategory.toUpperCase().replace(/^DR-/, ''), seat = ({ GEN: 'Open', OBC: 'OBC', SC: 'SC', ST: 'ST', EWS: 'EWS' } as Record<string, string>)[c] ?? c;
      rows.push(ri, r.rank, ii, course.get(normCourse(`MD/MS ${r.course}`)), quota.get('Goa State Quota'), acat.get(seat), ccat.get(seat === 'Open' ? 'General' : seat), r.page);
      continue;
    }
    if (rd.counselling === 'West Bengal') {
      const m = wbInst(r.institute);
      if (!m) { unknownMp.add(`WB ${r.institute}`); continue; }
      const ii = instIndex(`WB ${m[0]}`, rd.year, { display: m[1], code: m[2], state: 'West Bengal' });
      const qt = r.quota.toLowerCase();
      const q = /nri/.test(qt) ? 'NRI' : /management/.test(qt) ? 'Management' : /in-?service/.test(qt) ? (/dnb/.test(qt) ? 'In-service (DNB)' : 'In-service') : m[3] ? 'State Quota' : 'Private (state quota)';
      const seat = /nri|management/.test(qt) ? 'Open' : wbCat(r.allottedCategory);
      rows.push(ri, r.rank, ii, course.get(normCourse(wbCourse(r.course))), quota.get(`West Bengal ${q}`), acat.get(seat), ccat.get(wbCat(r.candidateCategory).replace(/^Open/, 'General')), r.page);
      continue;
    }
    if (rd.counselling === 'Odisha') {
      const mgmt = /\(MGT\)/.test(r.institute), k = r.institute.replace(/\s*\(MGT\)/, '').trim(), m = OD_INST[k];
      if (!m) unknownMp.add(`OD ${r.institute}`);
      const ii = instIndex(`OD ${k}`, rd.year, { display: m?.[0] ?? k, code: m?.[1] ?? '', state: 'Odisha' });
      const seat = mgmt ? 'Open' : OD_CAT[r.allottedCategory] ?? r.allottedCategory;
      const q = mgmt ? 'Management' : r.inService ? 'In-service' : m?.[1] ? 'State Quota' : 'Private (state quota)';
      rows.push(ri, r.rank, ii, course.get(normCourse(odCourse(r.course, r.courseType))), quota.get(`Odisha ${q}`), acat.get(seat), ccat.get(odCand(r.candidateCategory)), r.page);
      continue;
    }
    if (rd.counselling === 'Assam') {
      const code = AS_CODES[r.collegeCode] ?? '';
      const ii = instIndex(`AS ${r.collegeCode}`, rd.year, { display: r.institute, code, state: 'Assam' });
      const seat = r.inService ? (AS_CAT[r.candidateCategory] ?? r.candidateCategory) : AS_CAT[r.allottedCategory] ?? r.allottedCategory;
      const cand = (AS_CAT[r.candidateCategory] ?? r.candidateCategory).replace(/^Open$/, 'General') + (r.pwd ? ' PwD' : '');
      rows.push(ri, r.rank, ii, course.get(normCourse(asCourse(r.course))), quota.get(`Assam ${r.inService ? 'In-service (State Health Service)' : 'State Quota'}`), acat.get(seat + (r.pwd && !r.inService ? ' PwD' : '')), ccat.get(cand), r.page);
      continue;
    }
    if (rd.counselling === 'Uttar Pradesh') {
      const base = r.institute.replace(/\s*\((MUSLIM|JAIN)\s+MINORITY\)/i, ''), minority = base !== r.institute;
      const code = UP_CODES[r.collegeCode] ?? '';
      const ii = instIndex(`UP ${base.toLowerCase().replace(/[^a-z]/g, '')}`, rd.year, { display: titleCase(base).replace(/\bLko\b/, 'Lucknow').replace(/\bCollge\b/, 'College').replace(/\bUnivesity\b/, 'University').replace(/\bMeical\b/, 'Medical').replace(/\bBarilly\b/, 'Bareilly').replace(/ (Of|And) /g, (m) => m.toLowerCase()), code, state: 'Uttar Pradesh' });
      const seat = upSeat(r.allottedCategory);
      const q = r.inService ? 'In-service (bonus marks)' : minority ? 'Minority' : r.quota === 'Govt' ? 'State Quota' : 'Private (state quota)';
      rows.push(ri, r.rank, ii, course.get(normCourse(upCourse(r.course))), quota.get(`Uttar Pradesh ${q}`), acat.get(seat), ccat.get(upCand(r.candidateCategory)), r.page);
      continue;
    }
    if (rd.counselling === 'Jammu & Kashmir') {
      const k = r.institute.toUpperCase().replace(/\s+/g, ''), m = JK_INST[k];
      if (!m) unknownMp.add(`JK ${r.institute}`);
      const ii = instIndex(`JK ${k}`, rd.year, { display: m?.[0] ?? r.institute, code: m?.[1] ?? '', state: 'Jammu And Kashmir' });
      const [q, seat] = jkSeat(r.allottedCategory, r.institute, r.inService);
      rows.push(ri, r.rank, ii, course.get(normCourse(jkCourse(r.course))), quota.get(`Jammu & Kashmir ${q}`), acat.get(seat), ccat.get(jkCat(r.candidateCategory).replace(/^Open$/, 'General')), r.page);
      continue;
    }
    if (rd.counselling === 'Himachal Pradesh') {
      const m = hpInst(r.institute);
      if (!m) { unknownMp.add(`HP ${r.institute}`); continue; }
      const ii = instIndex(`HP ${m[0]}`, rd.year, { display: m[1], code: m[2], state: 'Himachal Pradesh' });
      const [q, seat] = hpSeat(r.quota, r.allottedCategory);
      const deg = r.course.replace(/^DNB\s+/i, '(NBEMS) ');
      rows.push(ri, r.rank, ii, course.get(normCourse(deg)), quota.get(`Himachal Pradesh ${q}`), acat.get(seat), ccat.get(seat === 'Open' ? 'Not stated' : seat.replace('Open PwD', 'Not stated PwD')), r.page);
      continue;
    }
    if (rd.counselling === 'Chhattisgarh') {
      const m = cgInst(r.institute);
      if (!m) { unknownMp.add(`CG ${r.institute}`); continue; }
      const ii = instIndex(`CG ${m[0]}`, rd.year, { display: m[1], code: m[2], state: 'Chhattisgarh' });
      const [q, seat] = cgSeat(r.quota, r.allottedCategory, m[3], r.inService);
      const cc = (r.candidateCategory || '').toUpperCase(), cand = cc === 'GN' || !cc ? 'General' : CG_CAT[cc] ?? cc;
      rows.push(ri, r.rank, ii, course.get(normCourse(cgCourse(r.course))), quota.get(`Chhattisgarh ${q}`), acat.get(seat), ccat.get(cand + (r.pwd ? ' PwD' : '')), r.page);
      continue;
    }
    if (rd.counselling === 'Punjab') {
      const m = pbInst(r.institute);
      if (!m) { unknownMp.add(`PB ${r.institute}`); continue; }
      const ii = instIndex(`PB ${m[0]}`, rd.year, { display: m[1], code: m[2], state: 'Punjab' });
      const [q, seat] = pbSeat(r.quota, r.allottedCategory, m[3], r.inService);
      const cand = /scheduled/i.test(r.candidateCategory) ? 'SC' : /backward|^bc/i.test(r.candidateCategory) ? 'BC' : /^ews/i.test(r.candidateCategory) ? 'EWS' : 'General';
      rows.push(ri, r.rank, ii, course.get(normCourse(pbCourse(r.course))), quota.get(`Punjab ${q}`), acat.get(seat), ccat.get(cand), r.page);
      continue;
    }
    if (rd.counselling === 'Bihar') {
      const k = r.institute.toUpperCase().replace(/[^A-Z]/g, ''), inst = BH_INST[k];
      if (!inst) unknownMp.add(`BH ${r.institute}`);
      const ii = instIndex(`BH ${k}`, rd.year, { display: inst?.[0] ?? r.institute, code: inst?.[1] ?? '', state: 'Bihar' });
      const [q, seat] = bhSeat(r.allottedCategory, inst);
      const cand = r.candidateCategory === 'UR' ? 'General' : BH_CAT[r.candidateCategory] ?? r.candidateCategory;
      rows.push(ri, r.rank, ii, course.get(normCourse(bhCourse(r.courseType, r.course))), quota.get(`Bihar ${q}`), acat.get(seat), ccat.get(cand), r.page);
      continue;
    }
    if (rd.counselling === 'Haryana') {
      const k = r.institute.toLowerCase().replace(/[^a-z]/g, ''), [display, code] = HR_INST[k] ?? [r.institute, ''];
      if (!HR_INST[k]) unknownMp.add(`HR ${r.institute}`);
      const ii = instIndex(`HR ${k}`, rd.year, { display, code, state: 'Haryana' });
      const [q, seat] = hrSeat(r.allottedCategory);
      rows.push(ri, r.rank, ii, course.get(normCourse(hrCourse(r.course))), quota.get(`Haryana ${q}`), acat.get(seat), ccat.get(seat.startsWith('Open') ? 'Not stated' + (seat.endsWith('PwD') ? ' PwD' : '') : seat), r.page);
      continue;
    }
    if (rd.counselling === 'Tamil Nadu') {
      const code = TN_CODES[r.institute] ?? codeFor(r.institute, rd.year);
      const ii = instIndex(`TN ${r.institute}`, rd.year, { display: code ? codeName(code) : titleCase(r.institute.replace(/,(?=\S)/g, ', ')), code, state: 'Tamil Nadu' });
      // GQ lists do not say which communal slot a seat was filled in; it is filed under the allottee's community (OC = Open),
      // so closing ranks read "last rank at which a candidate of this community got the seat".
      const comm = TN_COMM[r.candidateCategory] ?? (r.candidateCategory || 'Not stated');
      const seat = (r.quota === 'GQ' ? (comm === 'General' ? 'Open' : comm) : (r.allottedCategory || 'Open')) + (r.pwd ? ' PwD' : '');
      const cand = comm + (r.pwd ? ' PwD' : '');
      rows.push(ri, r.rank, ii, course.get(normCourse(tnCourse(r.course))), quota.get(`Tamil Nadu ${tnQuota(r.quota, r.inService)}`), acat.get(seat), ccat.get(cand), r.page);
      continue;
    }
    if (rd.counselling === 'Madhya Pradesh') {
      const k = mpKey(r.institute), [display, code] = MP_INST[k] ?? [r.institute.replace(/\s+/g, ' '), ''];
      if (!MP_INST[k]) unknownMp.add(r.institute);
      const ii = instIndex(`MP ${k}`, rd.year, { display, code, state: 'Madhya Pradesh' });
      const [q, seat] = mpSeat(r.allottedCategory, r.quota);
      rows.push(ri, r.rank, ii, course.get(normCourse(mpCourse(r.course, r.subject))), quota.get(`Madhya Pradesh ${q}`), acat.get(seat), ccat.get(mpCandidate(r.candidateCategory)), r.page);
      continue;
    }
    if (rd.counselling === 'Gujarat') {
      const code = GJ_CODES[r.collegeCode] ?? '';
      const ii = instIndex(`GJ ${r.collegeCode}`, rd.year, { display: GJ_NAMES[r.collegeCode] ?? r.institute, code, state: 'Gujarat' });
      const seat = gjSeat(r.allottedCategory), cand = gjSeat(r.candidateCategory).replace(/^Open/, 'General');
      rows.push(ri, r.rank, ii, course.get(normCourse(gjCourse(r.course))), quota.get(`Gujarat ${GJ_QUOTA[r.quota] ?? r.quota}`), acat.get(seat), ccat.get(cand), r.page);
      continue;
    }
    if (rd.counselling === 'Telangana') {
      const code = TG_CODES[r.collegeCode] ?? '';
      const ii = instIndex(`TG ${r.collegeCode}`, rd.year, { display: titleCase(r.institute), code, state: 'Telangana' });
      const [q, seat] = tgSeat(r.allottedCategory);
      rows.push(ri, r.rank, ii, course.get(normCourse(tgCourse(r.course))), quota.get(`Telangana ${q}`), acat.get(seat), ccat.get(tgCandidate(r.candidateCategory)), r.page);
      continue;
    }
    if (rd.counselling === 'Rajasthan') {
      const nk = r.institute.toLowerCase().replace(/[^a-z]/g, '');
      const code = RJ_CODES[nk] ?? '';
      const ii = instIndex(`RJ ${nk}`, rd.year, { display: rjDisplay(r.institute, nk), code, state: 'Rajasthan' });
      const seat = RJ_SEAT[r.allottedCategory.toUpperCase().replace(/\s+/g, '')] ?? r.allottedCategory;
      const cs = RJ_SEAT[r.candidateCategory.toUpperCase().replace(/\s+/g, '')] ?? r.candidateCategory, cand = cs === 'Open' ? 'General' : cs;
      rows.push(ri, r.rank, ii, course.get(normCourse(rjCourse(r.course))), quota.get(`Rajasthan ${r.inService ? 'In-service (bonus marks)' : rjQuota(r.quota)}`), acat.get(seat), ccat.get(cand), r.page);
      continue;
    }
    if (rd.counselling === 'Andhra Pradesh') {
      const code = AP_CODES[r.collegeCode] ?? '';
      const ii = instIndex(`AP ${r.collegeCode || r.institute}`, rd.year, { display: r.institute.replace(/[.\s]+$/, ''), code, state: 'Andhra Pradesh' });
      const q = r.allottedCategory === 'MINORITY' ? 'Minority' : apQuota(r.seat, r.sub, r.area);
      const seat = apSeat(r.allottedCategory);
      rows.push(ri, r.rank, ii, course.get(normCourse(r.course)), quota.get(`Andhra Pradesh ${q}`), acat.get(seat), ccat.get(seat === 'Open' ? 'Not stated' : seat), r.page);
      continue;
    }
    if (rd.counselling === 'Kerala') {
      const code = KL_CODES[r.collegeCode] ?? '';
      const ii = instIndex(`KL ${r.collegeCode || r.institute}`, rd.year, { display: r.institute.replace(/[.\s]+$/, '').replace(/,(?=\S)/g, ', '), code, state: 'Kerala' });
      const [q, seat] = klSeat(r.allottedCategory);
      rows.push(ri, r.rank, ii, course.get(normCourse(r.course)), quota.get(`Kerala ${q}`), acat.get(seat), ccat.get(klCandidate(r.candidateCategory)), r.page);
      continue;
    }
    if (rd.counselling.startsWith('Karnataka')) {
      const code = KA_CODES[r.collegeCode] ?? KA_NAMES.find(([re]) => re.test(r.institute))?.[1] ?? '';
      const ii = instIndex(`KA ${r.collegeCode || r.institute}`, rd.year, { display: r.institute.replace(/\s+/g, ' ').replace(/\s*,\s*$/, '').replace(/,(?=\S)/g, ', '), code, state: 'Karnataka' });
      const [q, seat] = kaSeat(r.allottedCategory, r.seatType, rd.counselling.endsWith('in-service'));
      const cand = seat.startsWith('Open') ? 'Not stated' + (seat.endsWith('PwD') ? ' PwD' : '') : seat;
      const ci = course.get(normCourse(kaCourse(r.course))), qi = quota.get(`Karnataka ${q}`);
      rows.push(ri, r.rank, ii, ci, qi, acat.get(seat), ccat.get(cand), r.page);
      if (r.fee > 0) setFee(ii, ci, qi, r.fee, rd.year, 'Karnataka KEA allotment lists');
      continue;
    }
    rows.push(ri, r.rank, instIndex(r.institute, rd.year), course.get(normCourse(r.course)), quota.get(normQuota(r.quota)),
      acat.get(normSeatCat(r.allottedCategory)), ccat.get(normCandCat(r.candidateCategory)), r.page);
  }
  rd.count = d.rows.length;
  console.log(`${rd.id}: ${d.rows.length}`);
});

// ---- state fee files (pipeline/states/fees.ts) ----
{
  const gj = load('data/parsed/fees_gj2025.json'), courseIdx = new Map(course.arr.map((c, i) => [c, i]));
  const GJF: Record<string, string> = { GQ: 'Gujarat State Quota', MQ: 'Gujarat Management', NQ: 'Gujarat NRI' };
  let n = 0, miss = 0;
  for (const r of gj.rows) {
    const ii = instM.get(norm(`GJ ${r.collegeCode}`));
    const name = r.course.replace(/^(MD|MS)\s*-\s*/, '').replace(/^DIPLOMA-/, '').replace(/\s*\([^)]*\)?\s*$/, '').replace(/Anesthesiology/, 'Anaesthesiology').replace(/Gynecology/, 'Gynaecology');
    const ci = courseIdx.get(normCourse(/^Diploma/i.test(name) ? name : gjCourse(name)));
    if (ii == null || ci == null) { miss++; continue; }
    for (const [k, label] of Object.entries(GJF)) if (r[k]) { setFee(ii, ci, quota.get(label), r[k], gj.year, 'Gujarat ACPPGMEC fee structure'); n++; }
    // University quota and in-service seats are sub-quotas of the government-quota seats and pay the GQ fee.
    if (r.GQ) for (const label of ['Gujarat University Quota', 'Gujarat In-service']) { setFee(ii, ci, quota.get(label), r.GQ, gj.year, 'Gujarat ACPPGMEC fee structure (government-quota fee)'); n++; }
  }
  console.log(`fees: Gujarat ${n} (${miss} fee rows without a matching college/course); total ${fees.size}`);
  // Rajasthan government colleges (Rajasthan NEET PG Board fee table 2025, data/raw/states/rajasthan/rj2025_fees_govt.pdf):
  // one yearly tuition fee per college group and seat type, the same for every branch. MCC code → [government seat, management seat].
  const RJF: Record<string, [number, number | null]> = {
    700327: [8053, null], 700334: [8053, null], 700311: [8053, null], 700317: [8053, null], 700332: [8053, null], 700308: [8053, null],
    901806: [63800, 868200], 901863: [63800, 868200], 901803: [63800, 868200], 901860: [63800, 868200], 901805: [63800, 868200], 700337: [63800, 868200],
    700524: [63800, 868200], 904560: [250000, null],
  };
  const govQ = new Set(['Rajasthan State Quota', 'Rajasthan In-service (bonus marks)'].map((q) => quota.get(q))), mgmtQ = quota.get('Rajasthan Management');
  let rj = 0;
  for (let k = 0; k < rows.length; k += 8) {
    const ii = rows[k + 2], f = RJF[inst[ii][3]];
    if (!f || inst[ii][2] !== 'Rajasthan' || !inst[ii][1].startsWith('RJ ')) continue;
    const qi = rows[k + 4], fee = govQ.has(qi) ? f[0] : qi === mgmtQ ? f[1] : null;
    if (fee && !fees.has(`${ii}.${rows[k + 3]}.${qi}`)) { setFee(ii, rows[k + 3], qi, fee, 2025, 'Rajasthan NEET PG Board fee table'); rj++; }
  }
  console.log(`fees: Rajasthan ${rj}; total ${fees.size}`);
  // Government colleges in every state: the state-quota / in-service tuition is the college's own fee, which it declares to MCC
  // (institute profile, year-1 fee). Used only where no state source gave a fee, and never for management / NRI / private seats.
  const govQuota = (label: string) => /State Quota|Government|In-service/.test(label) && !/Private|Management|NRI|Minority|Self-finance/.test(label);
  // Course group used by fee orders: pre-clinical, para-clinical, clinical.
  const PRE = /^(Anatomy|Physiology|Biochemistry) /, PARA = /^(Pathology|Microbiology|Pharmacology|Forensic Medicine|Community Medicine|Immunohaematology|Laboratory Medicine) /;
  const group = (ci: number) => (PRE.test(course.arr[ci]) ? 'pre' : PARA.test(course.arr[ci]) ? 'para' : 'clinical');
  const ap = load('data/parsed/fees_ap2025.json'), tg = load('data/parsed/fees_tg2023.json');
  const tgBy = new Map<string, any>(tg.rows.map((r: any) => [r.collegeCode, r]));
  let apn = 0, tgn = 0;
  for (let k = 0; k < rows.length; k += 8) {
    const ii = rows[k + 2], ci = rows[k + 3], qi = rows[k + 4], label = quota.arr[qi], key = `${ii}.${ci}.${qi}`;
    if (fees.has(key)) continue;
    const [, full, state, code] = inst[ii], g = group(ci);
    if (state === 'Andhra Pradesh' && full.startsWith('AP ') && !code) { // private unaided college
      const cat = /State Quota|Minority/.test(label) ? 'A' : /Management/.test(label) ? 'B' : /NRI|Institutional/.test(label) ? 'C' : '';
      if (!cat) continue;
      const t = ap.categories[cat], fee = g === 'pre' ? t.pre : g === 'para' ? t.para : t.clinical;
      setFee(ii, ci, qi, fee, 2025, cat === 'A' ? 'Dr NTR UHS competent authority notification (2024-25 fee)' : 'Dr NTR UHS management quota notification 2025-26 (G.O.Rt.No.777)'); apn++;
    }
    if (state === 'Telangana' && full.startsWith('TG ')) {
      const r = tgBy.get(full.slice(3)); if (!r) continue;
      const cat = /State Quota|Minority|In-service/.test(label) ? 0 : /Management/.test(label) ? 1 : -1;
      if (cat < 0) continue;
      const pair = g === 'pre' ? r.nonClinical : g === 'para' ? r.para : r.clinical;
      setFee(ii, ci, qi, pair[cat], 2025, 'Telangana G.O.Ms.No.107 (2023-26 fee order)'); tgn++;
    }
  }
  console.log(`fees: Andhra Pradesh private ${apn}; Telangana private ${tgn}; total ${fees.size}`);
  // Madhya Pradesh: DME MP fee details report (every college × subject, 2026): tuition for private / NRI / government seats.
  {
    const mpf = load('data/parsed/fees_mp2026.json'), courseIdx = new Map(course.arr.map((c, i) => [c, i]));
    const byKey = new Map<string, any>();
    let miss = 0;
    for (const r of mpf.rows) {
      const ii = instM.get(norm(`MP ${r['Institute Name'].toUpperCase().replace(/[^A-Z]/g, '')}`));
      const ci = courseIdx.get(normCourse(mpCourse(r.Course, r['Subject Name'].replace(/\s+/g, ''))));
      if (ii == null || ci == null) { miss++; continue; }
      byKey.set(`${ii}.${ci}`, r);
    }
    let n = 0;
    for (let k = 0; k < rows.length; k += 8) {
      const ii = rows[k + 2], ci = rows[k + 3], qi = rows[k + 4], r = byKey.get(`${ii}.${ci}`), key = `${ii}.${ci}.${qi}`;
      if (!r || fees.has(key)) continue;
      const label = quota.arr[qi];
      const fee = /NRI/.test(label) ? r['PVT NRI Fees'] : /Private/.test(label) ? r['PVT Tution Fees'] : /State Quota|In-service/.test(label) ? r['GOVT Tution Fees'] : 0;
      if (fee > 0) { setFee(ii, ci, qi, fee, mpf.year, mpf.label); n++; }
    }
    console.log(`fees: Madhya Pradesh ${n} (${miss} fee rows without a matching college/course); total ${fees.size}`);
  }
  // Punjab: Govt of Punjab corrigendum MER-HTH305C/9/2024-5HB3/I/125469/2025 dt 13-06-2025 (fees from session 2025), as given
  // in the BFUHS NEET-PG 2026 prospectus (six-month first instalment × 2) and the BFUHS notice of 28/10/2026. Basic sciences:
  // Anatomy, Biochemistry, Transfusion, Microbiology, Pharmacology, Physiology, Community Medicine, Forensic Medicine (Pathology
  // is clinical in Punjab). NRI fees are in US dollars and not recorded.
  {
    const BASIC = /^(Anatomy|Biochemistry|Immunohaematology|Microbiology|Pharmacology|Physiology|Community Medicine|Forensic Medicine) /;
    let n = 0;
    for (let k = 0; k < rows.length; k += 8) {
      const ii = rows[k + 2], ci = rows[k + 3], qi = rows[k + 4], key = `${ii}.${ci}.${qi}`, [, full, state] = inst[ii];
      if (state !== 'Punjab' || !full.startsWith('PB ') || fees.has(key) || /NRI/.test(quota.arr[qi])) continue;
      const e = PB_INST.find(([kk]) => full === `PB ${kk}`); if (!e) continue;
      const c = course.arr[ci], govt = e[3];
      const fee = /\(DNB\)$/.test(c) ? (govt ? 75000 : 0) : /\(Diploma\)$/.test(c) ? (govt ? 125000 : 410000)
        : BASIC.test(c) ? (govt ? 100000 : 275000) : (govt ? 125000 : 685000);
      if (fee) { setFee(ii, ci, qi, fee, 2025, 'Govt of Punjab fee corrigendum 13-06-2025 (BFUHS prospectus)'); n++; }
    }
    console.log(`fees: Punjab ${n}; total ${fees.size}`);
  }
  // Kerala government colleges: CEE PG Medical 2025 prospectus §3.1 (G.O.(Ms)No.92/2023/H&FWD dt 19-04-2023): annual tuition
  // ₹57,890. Self-financing colleges' fees were notified separately and that notice has been removed from cee.kerala.gov.in.
  {
    let n = 0;
    for (let k = 0; k < rows.length; k += 8) {
      const ii = rows[k + 2], ci = rows[k + 3], qi = rows[k + 4], key = `${ii}.${ci}.${qi}`, [, full, state, code] = inst[ii];
      if (state !== 'Kerala' || !full.startsWith('KL ') || !code || fees.has(key) || !/^Kerala (State Quota|In-service)$/.test(quota.arr[qi])) continue;
      setFee(ii, ci, qi, 57890, 2025, 'CEE Kerala PG prospectus 2025 (G.O.(Ms)No.92/2023)'); n++;
    }
    console.log(`fees: Kerala government ${n}; total ${fees.size}`);
  }
  // per-college fee orders (pipeline/states/fees.ts → data/parsed/fees_college_<state>.json)
  const unmatchedFee = new Set<string>();
  for (const f of readdirSync('data/parsed').filter((x) => x.startsWith('fees_college_'))) {
    const fc = load(`data/parsed/${f}`), byInst = new Map<number, any>();
    for (const c of fc.colleges) { const ii = instM.get(norm(c.inst)); if (ii == null) console.log(`  ${f}: no institute ${c.inst}`); else byInst.set(ii, c); }
    const qre = Object.entries(fc.quotas as Record<string, string>).map(([k, re]) => [k, new RegExp(re)] as const);
    let n = 0;
    for (let k = 0; k < rows.length; k += 8) {
      const ii = rows[k + 2], c = byInst.get(ii); if (!c) continue;
      const ci = rows[k + 3], qi = rows[k + 4], key = `${ii}.${ci}.${qi}`; if (fees.has(key)) continue;
      const label = quota.arr[qi].replace(`${fc.state} `, ''), kind = qre.find(([, re]) => re.test(label))?.[0];
      if (!kind) continue;
      let fee = 0;
      const md = / \(MD\/MS\)$/.test(course.arr[ci]), spec = course.arr[ci].replace(/ \(MD\/MS\)$/, '');
      if (md && c.courseFees?.[kind]?.[spec] != null) fee = c.courseFees[kind][spec]; // subject-specific fee wins
      else if (c.fees?.[kind]) { const f3 = c.fees[kind], g = group(ci); fee = g === 'clinical' ? f3[0] : g === 'para' ? f3[1] : f3[2]; }
      else if (c.courseFees?.[kind] && md) unmatchedFee.add(`${fc.state}: ${spec}`);
      if (fee > 0) { setFee(ii, ci, qi, fee, fc.year, fc.label); n++; }
    }
    console.log(`fees: ${f} ${n}; total ${fees.size}`);
  }
  if (unmatchedFee.size) console.log('  branches with allotments but no fee in the order:', [...unmatchedFee].join(', '));
  // MCC's own rounds (AIQ, deemed, central, DNB): the fee the institute declared to MCC; NRI seats use the declared NRI fee.
  const firstFee = (...v: unknown[]) => v.map(Number).find((x) => x > 1000) ?? 0;
  const MCC_QUOTAS = new Set(Object.values(QUOTA));
  let mcc = 0, aiq = 0;
  for (let k = 0; k < rows.length; k += 8) {
    const ii = rows[k + 2], code = inst[ii][3], qi = rows[k + 4], ci = rows[k + 3], label = quota.arr[qi];
    const p = code ? profiles[code] : undefined, key = `${ii}.${ci}.${qi}`;
    if (!p || fees.has(key)) continue;
    if (MCC_QUOTAS.has(label)) {
      const fee = /Non-Resident|NRI/.test(label) ? firstFee(p.nriFeeY1) : firstFee(p.feeY1, p.annualFee, p.feeAtAdmission);
      if (fee) { setFee(ii, ci, qi, fee, 2026, 'MCC institute profile'); aiq++; }
      continue;
    }
    if (!registry.get(code)?.kinds.has('aiq') || !govQuota(label)) continue;
    const fee = firstFee(p.feeY1, p.annualFee, p.feeAtAdmission);
    if (fee) { setFee(ii, ci, qi, fee, 2026, 'MCC institute profile (government college fee)'); mcc++; }
  }
  console.log(`fees: MCC seats from profiles ${aiq}; state government colleges from MCC profiles ${mcc}; total ${fees.size}`);
}

// ---- seat matrices → [year, code index, course, quota, seat category, seats] ----
const SM_CAT: Record<string, string> = { OP: 'Open', EW: 'EWS', BC: 'OBC', SC: 'SC', ST: 'ST' };
const specOf = (c: string) => SPECIALTY.find(([re]) => re.test(c.toLowerCase().replace(/\s+/g, '')))?.[1];
// 2026 matrices append a short branch code, e.g. "M.D. Anaesthesiology (ASTH)"; older ones put the name itself in brackets.
const matrixCourse = (b: string) => { const cut = b.replace(/\s*\([A-Z0-9-]{2,6}\)\s*$/, ''); return normCourse(specOf(cut) ? cut : b); };
const codes = [...registry.keys()].sort();
const codeIdx = new Map(codes.map((c, i) => [c, i]));
const smRows: number[] = [];
const smCount = new Map<string, number>();
for (const m of matrices) for (const r of m.rows) {
  const cat = r.category.replace(/\s+/g, ''); // "OP NO", or "OPNO" in 2024 DNB
  const [a, b] = [cat.slice(0, 2), cat.slice(2)];
  smRows.push(m.year, codeIdx.get(r.code)!, course.get(matrixCourse(r.branch)), quota.get(normQuota(r.quota)), acat.get(SM_CAT[a] + (b === 'PH' ? ' PwD' : '')), r.seats);
  smCount.set(`${m.year} ${m.kind}`, (smCount.get(`${m.year} ${m.kind}`) ?? 0) + r.seats);
}

// Stable ids (survive rebuilds, so saved lists and shared URLs keep working): institutes hash their
// normalised name; branches and quotas are slugs of their labels.
const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const instId = (full: string) => createHash('sha1').update(norm(full)).digest('hex').slice(0, 10);
const QUOTA_LABEL: Record<string, string> = { 'Self-Financed Merit Seat': 'Deemed / paid seat', 'DNB Quota': 'DNB' };

const data = {
  meta: { builtAt: new Date().toISOString(), portal: 'https://mcc.nic.in/pg-medical-counselling/', archive: 'https://mcc.nic.in/archive-pg/' },
  rounds: rounds.map(({ id, year, label, url, count, counselling, kind }) => ({ id, year, label, url, count, counselling, ...(kind ? { kind } : {}) })),
  // [id, display name, full name as printed by MCC, state, MCC institute code or '']
  inst: inst.map(([display, full, state, code]) => [instId(full), display, full, state, code]),
  // [MCC institute code, name, state, types]
  codes: codes.map((c) => [c, codeName(c), codeState(c), [...registry.get(c)!.kinds].map((k) => KIND_TYPE[k]).join(', ')]),
  course: course.arr.map((c) => [slug(c), c]),
  quota: quota.arr.map((q) => [slug(q), QUOTA_LABEL[q] ?? q]),
  acat: acat.arr, ccat: ccat.arr, rows,
  matrix: smRows,
  // [institute, course, quota, yearly tuition fee, year, source index]
  fees: (() => { const srcs = [...new Set([...fees.values()].map((f) => f.src))]; return { sources: srcs, rows: [...fees].map(([k, f]) => [...k.split('.').map(Number), f.fee, f.year, srcs.indexOf(f.src)]) }; })(),
  matrixSources: Object.entries(SM_SOURCES).map(([id, path]) => ({ year: Number(id.slice(2, 6)), kind: KIND_TYPE[id.slice(7)], url: U + path, seats: smCount.get(`${id.slice(2, 6)} ${id.slice(7)}`) ?? 0 })),
  profiles: Object.fromEntries(Object.entries(profiles).filter(([c]) => codeIdx.has(c))),
  profileSource: 'https://mcc.admissions.nic.in/Applicant/Report/ViewInstituteProfileDynamic.aspx?enc=b3y6S6rqn323+Rrps4aJmWq6uDzwcVyR2D994Iqx3miWKIwOHdAUl7I6zs1LI/bNq85fKhJWyvHvAMhgNvbzOg==',
};
writeFileSync('data/pgdata.json', JSON.stringify(data));
console.log(`rows=${rows.length / 8} institutes=${inst.length} noState=${inst.filter((x) => !x[2]).length} courses=${course.arr.length} quotas=${JSON.stringify(quota.arr)}`);
console.log('seat cats', JSON.stringify(acat.arr), 'cand cats', JSON.stringify(ccat.arr));
console.log('unmatched courses', [...unmatchedCourses]);
console.log('unknown MP institutes', [...unknownMp]);
console.log('no state', inst.filter((x) => !x[2]).slice(0, 10).map((x) => x[1].slice(0, 100)));
let linked = 0; for (let k = 0; k < rows.length; k += 8) if (inst[rows[k + 2]][3]) linked++;
console.log(`allotments linked to an institute code: ${linked}/${rows.length / 8} (${Math.round((linked / (rows.length / 8)) * 100)}%)`);
console.log(`codes=${codes.length} matrixRows=${smRows.length / 6} profiles=${Object.keys(data.profiles).length}`, Object.fromEntries(smCount));
console.log('unlinked institutes (sample)', inst.filter((x) => !x[3]).slice(0, 8).map((x) => x[1].slice(0, 90)));
