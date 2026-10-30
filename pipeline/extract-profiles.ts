/**
 * MCC institute profile PDFs (data/raw/profiles/<code>.pdf) → data/parsed/profiles_2026.json.
 *
 * Each profile is a two-column "label : value" table. Labels are matched loosely (letters only, lower-case)
 * because MCC's wording varies slightly between institutes. Only institutional fields are kept: officials'
 * names, phone numbers and e-mail addresses are deliberately dropped.
 *
 * Usage: tsx pipeline/extract-profiles.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readPages } from './engine';
import { gridRows } from './grid';

const DIR = 'data/raw/profiles';
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// label pattern (on key()) → field. First match wins, so specific patterns come first.
const FIELDS: [RegExp, string][] = [
  [/^nameofthecollege/, 'name'],
  [/^completemailingaddress/, 'address'],
  [/^pincode/, 'pin'],
  [/^nameofaffiliatinguniversity/, 'university'],
  [/hostelfee1styearnri|1styearnri/, 'nriFeeY1'], [/2ndyearnri/, 'nriFeeY2'], [/3rdyearnri/, 'nriFeeY3'],
  [/hostelfee1styear/, 'feeY1'], [/hostelfee2ndyear/, 'feeY2'], [/hostelfee3rdyear/, 'feeY3'],
  [/^amounttobepaidatthetimeofadmissionincludinghostelfees/, 'feeAtAdmission'],
  [/stipendpaidtothestudentsistyear|stipend.*1styear|stipend.*istyear/, 'stipendY1'],
  [/stipend.*iindyear|stipend.*2ndyear/, 'stipendY2'],
  [/stipend.*iiirdyear|stipend.*3rdyear/, 'stipendY3'],
  [/^hostelfacilityformale/, 'hostelMale'], [/^hostelfacilityforfemale/, 'hostelFemale'],
  [/reallocationofseat/, 'reallocationDeduction'],
  [/reimbursedincasecandidateresigns/, 'resignRefund'],
  [/forfeitedincaseofresigning/, 'forfeitOnResign'],
  [/^annualfeesofcandidates/, 'annualFee'],
  [/^websiteaddress/, 'website'],
  [/^miscellaneouscharges/, 'miscCharges'],
  [/^pwbdfriendly/, 'pwbdFriendly'],
  [/bondamount|servicebond|bondperiod|bond/, 'bond'],
];
const NUMERIC = new Set(['feeAtAdmission', 'feeY1', 'feeY2', 'feeY3', 'nriFeeY1', 'nriFeeY2', 'nriFeeY3', 'stipendY1', 'stipendY2', 'stipendY3',
  'reallocationDeduction', 'resignRefund', 'forfeitOnResign', 'annualFee', 'miscCharges']);
// Values are free text ("For MD/MS-100800 and For Diploma-75600", "52700 plus 10% HRA"): take the first amount,
// and keep the wording (as <field>Text) whenever it says more than a bare number.
const toNum = (v: string) => { const m = v.match(/\d[\d,]*(?:\.\d+)?/); const n = m ? Number(m[0].replace(/,/g, '')) : NaN; return Number.isFinite(n) ? n : null; };

const files = readdirSync(DIR).filter((f) => /^\d{6}\.pdf$/.test(f));
const out: Record<string, Record<string, string | number | null>> = {};
const unknownLabels = new Map<string, number>();
let failed = 0;
for (const f of files) {
  const code = f.slice(0, 6);
  const rec: Record<string, string | number | null> = {};
  try {
    for await (const pg of readPages(new Uint8Array(readFileSync(`${DIR}/${f}`)))) {
      for (const r of gridRows(pg)) {
        const cells = r.map((c) => c.trim()).filter(Boolean);
        if (cells.length < 2) continue;
        const [label, value] = [cells[0], cells.slice(1).join(' ')];
        const k = key(label);
        const field = FIELDS.find(([re]) => re.test(k))?.[1];
        if (!field) { unknownLabels.set(label.slice(0, 80), (unknownLabels.get(label.slice(0, 80)) ?? 0) + 1); continue; }
        if (field in rec) continue; // first occurrence wins (NRI rows repeat the resident labels' wording)
        if (NUMERIC.has(field)) {
          rec[field] = toNum(value);
          if (/[a-z]/i.test(value) && !/^(na|nil|n\/a)$/i.test(value.trim())) rec[`${field}Text`] = value;
        } else rec[field] = value === 'NA' ? null : value;
      }
    }
    out[code] = rec;
  } catch {
    failed++;
  }
}
writeFileSync('data/parsed/profiles_2026.json', JSON.stringify({ extractedAt: new Date().toISOString(), board: '140012621', profiles: out }));
const n = Object.keys(out).length;
const have = (k: string) => Object.values(out).filter((r) => r[k] != null && r[k] !== 0).length;
console.log(`profiles=${n} failed=${failed} withFee=${have('feeY1')} withAnnualFee=${have('annualFee')} withStipend=${have('stipendY1')} withBond=${have('bond')}`);
console.log('labels not mapped (ignored):', [...unknownLabels.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25));
