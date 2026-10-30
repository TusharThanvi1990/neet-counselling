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
const ROUND_ORDER = ['Round 1', 'Round 2', 'Round 3', 'Stray', 'Special stray'];

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
  [/chikkaballapur|chikkamagaluru|karnata/i, 'Karnataka'], [/anantnag|baramulla|j&k/i, 'Jammu And Kashmir'], [/korba|c\.g\./i, 'Chhattisgarh'],
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
  [/obst|gyna/, 'Obstetrics & Gynaecology'], [/paediatric|childhealth/, 'Paediatrics'],
  [/radiationmedicine/, 'Radiation Medicine'], [/radio-?therap|radiation/, 'Radiation Oncology'], [/radio-?diag|radiology/, 'Radiodiagnosis'],
  [/derm|d\.d\.v\.l|venere/, 'Dermatology'], [/ortho/, 'Orthopaedics'], [/ophthal/, 'Ophthalmology'],
  [/otorhino|oto-rhino|e\.?n\.?t\b|\bent\b/, 'ENT'], [/anaesth/, 'Anaesthesiology'], [/psychiat|psycholog/, 'Psychiatry'],
  [/respiratory|tuberculosis|t\.b\.|chest|pulmonary/, 'Respiratory Medicine'], [/emergency/, 'Emergency Medicine'], [/family/, 'Family Medicine'],
  [/forensic/, 'Forensic Medicine'], [/community|preventive|publichealth|epidemiolog/, 'Community Medicine'],
  [/administration|admn/, 'Hospital Administration'], [/immuno|transfusion/, 'Immunohaematology & Transfusion'],
  [/microbio|bacterio/, 'Microbiology'], [/laboratory/, 'Laboratory Medicine'], [/patholog/, 'Pathology'], [/pharmacol/, 'Pharmacology'],
  [/physiolog/, 'Physiology'], [/bio-?chem/, 'Biochemistry'], [/anatomy/, 'Anatomy'], [/physicalmed|phy\.medicine/, 'Physical Medicine & Rehab'],
  [/geriatric/, 'Geriatrics'], [/palliative/, 'Palliative Medicine'], [/nuclear/, 'Nuclear Medicine'], [/sport/, 'Sports Medicine'],
  [/tropical/, 'Tropical Medicine'], [/aerospace/, 'Aerospace Medicine'], [/diabetolog/, 'Diabetology'],
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
const instIndex = (full: string, year: number) => {
  const ik = norm(full);
  let i = instM.get(ik);
  if (i != null) return i;
  const cut = full.search(/,(?=\S)/);
  const display = (cut > 0 ? full.slice(0, cut) : full.split(',').slice(0, 2).join(',')).trim().replace(/\s+/g, ' ');
  const code = codeFor(full, year);
  const state = (code && codeState(code)) || stateFromText(full);
  i = inst.length; inst.push([display, full, state, code]); instM.set(ik, i);
  return i;
};

// ---- rounds ----
const files = readdirSync('data/parsed').filter((f) => /^mcc20\d\d_[a-z0-9]+\.json$/.test(f)).map((f) => f.replace('.json', ''))
  .filter((f) => SOURCES[f]);
const rounds = files.map((f) => ({ id: f, year: Number(f.slice(3, 7)), label: SOURCES[f][0], url: U + SOURCES[f][1], count: 0 }))
  .sort((a, b) => a.year - b.year || ROUND_ORDER.indexOf(a.label) - ROUND_ORDER.indexOf(b.label));
const rows: number[] = [];
rounds.forEach((rd, ri) => {
  const d = load(`data/parsed/${rd.id}.json`);
  for (const r of d.rows) {
    rows.push(ri, r.rank, instIndex(r.institute, rd.year), course.get(normCourse(r.course)), quota.get(normQuota(r.quota)),
      acat.get(normSeatCat(r.allottedCategory)), ccat.get(normCandCat(r.candidateCategory)), r.page);
  }
  rd.count = d.rows.length;
  console.log(`${rd.id}: ${d.rows.length}`);
});

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
  rounds: rounds.map(({ id, year, label, url, count }) => ({ id, year, label, url, count })),
  // [id, display name, full name as printed by MCC, state, MCC institute code or '']
  inst: inst.map(([display, full, state, code]) => [instId(full), display, full, state, code]),
  // [MCC institute code, name, state, types]
  codes: codes.map((c) => [c, codeName(c), codeState(c), [...registry.get(c)!.kinds].map((k) => KIND_TYPE[k]).join(', ')]),
  course: course.arr.map((c) => [slug(c), c]),
  quota: quota.arr.map((q) => [slug(q), QUOTA_LABEL[q] ?? q]),
  acat: acat.arr, ccat: ccat.arr, rows,
  matrix: smRows,
  matrixSources: Object.entries(SM_SOURCES).map(([id, path]) => ({ year: Number(id.slice(2, 6)), kind: KIND_TYPE[id.slice(7)], url: U + path, seats: smCount.get(`${id.slice(2, 6)} ${id.slice(7)}`) ?? 0 })),
  profiles: Object.fromEntries(Object.entries(profiles).filter(([c]) => codeIdx.has(c))),
  profileSource: 'https://mcc.admissions.nic.in/Applicant/Report/ViewInstituteProfileDynamic.aspx?enc=b3y6S6rqn323+Rrps4aJmWq6uDzwcVyR2D994Iqx3miWKIwOHdAUl7I6zs1LI/bNq85fKhJWyvHvAMhgNvbzOg==',
};
writeFileSync('data/pgdata.json', JSON.stringify(data));
console.log(`rows=${rows.length / 8} institutes=${inst.length} noState=${inst.filter((x) => !x[2]).length} courses=${course.arr.length} quotas=${JSON.stringify(quota.arr)}`);
console.log('seat cats', JSON.stringify(acat.arr), 'cand cats', JSON.stringify(ccat.arr));
console.log('unmatched courses', [...unmatchedCourses]);
console.log('no state', inst.filter((x) => !x[2]).slice(0, 10).map((x) => x[1].slice(0, 100)));
let linked = 0; for (let k = 0; k < rows.length; k += 8) if (inst[rows[k + 2]][3]) linked++;
console.log(`allotments linked to an institute code: ${linked}/${rows.length / 8} (${Math.round((linked / (rows.length / 8)) * 100)}%)`);
console.log(`codes=${codes.length} matrixRows=${smRows.length / 6} profiles=${Object.keys(data.profiles).length}`, Object.fromEntries(smCount));
console.log('unlinked institutes (sample)', inst.filter((x) => !x[3]).slice(0, 8).map((x) => x[1].slice(0, 90)));
