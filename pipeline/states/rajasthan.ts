/**
 * Rajasthan NEET PG state counselling (NEET PG Admission/Counselling Board, SMS Medical College) → allotments in the
 * same shape as MCC rounds.
 *
 * The board's allotment lists (rajpgneet2025.in/notifications/<id>.pdf) give the Combined State Merit No., category,
 * course, seat type, college and NEET PG roll number. The round-wise Provisional State Merit Lists give each roll
 * number's NEET Rank (All India Rank), so every allotment gets an AIR. Names are printed in both lists; they are
 * skipped and never written out.
 *
 * rajpgneet2025.in was offline (503) when this was built; the PDFs were retrieved from the Internet Archive's copies
 * of the official URLs, which are kept as the source links.
 *
 * Usage: tsx pipeline/states/rajasthan.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readPages } from '../engine';
import { gridTable } from '../grid';

const RAW = 'data/raw/states/rajasthan';
const SITE = 'https://rajpgneet2025.in/notifications/';
const ROUNDS: [string, string, string][] = [ // [file, round label, official PDF id]
  ['rj2025_r1', 'Round 1', '1765044823670'],
  ['rj2025_r2', 'Round 2', '1766732402146'],
  ['rj2025_r3', 'Round 3', '1771171673167'],
  ['rj2025_stray', 'Stray', '1772018528162'],
];
const MERIT = ['rj2025_merit_r1b', 'rj2025_merit_r2', 'rj2025_merit_r3', 'rj2025_merit_r3rev', 'rj2025_merit_stray'];
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

async function* tables(file: string) {
  for await (const pg of readPages(new Uint8Array(readFileSync(`${RAW}/${file}.pdf`)))) yield { page: pg.index + 1, rows: gridTable(pg).rows };
}

// ---- roll number → NEET rank (AIR), from the merit lists ----
const air = new Map<string, number>(), inService = new Set<string>();
for (const f of MERIT) {
  let roll = -1, rank = -1, svc = -1, n = 0;
  for await (const { rows } of tables(f)) {
    for (const cells of rows) {
      const ks = cells.map(key);
      const r = ks.findIndex((k) => k.includes('rollnumber')), k2 = ks.findIndex((k) => k === 'neetrank');
      if (r >= 0) { roll = r; rank = k2; svc = ks.findIndex((k) => k.startsWith('inservicenonservice')); continue; }
      if (roll < 0 || rank < 0) continue;
      const rl = (cells[roll] ?? '').replace(/\D/g, ''), rk = (cells[rank] ?? '').replace(/\D/g, '');
      if (/^\d{11}$/.test(rl) && rk) {
        air.set(rl, Number(rk)); n++;
        if (svc >= 0) { if (/^in/i.test((cells[svc] ?? '').replace(/\W/g, ''))) inService.add(rl); else inService.delete(rl); }
      }
    }
  }
  console.log(`${f}: ${n} roll numbers with a NEET rank`);
}
console.log(`roll → AIR: ${air.size} (${inService.size} in-service, who get bonus marks on the state merit list)`);

// ---- allotment lists ----
const statuses = new Map<string, number>(), cats = new Map<string, number>(), seats = new Map<string, number>();
const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const held = new Map<string, string>(); // roll → seat held after the previous round (Round 2 re-lists everyone)
for (const [file, label, id] of ROUNDS) {
  const out: any[] = [];
  let col: Record<string, number> | null = null, noAir = 0, skipped = 0, same = 0;
  const nowHeld = new Map<string, string>();
  for await (const { page, rows } of tables(file)) {
    for (const cells of rows) {
      const ks = cells.map(key);
      if (ks.some((k) => k.includes('meritno'))) {
        const find = (...names: string[]) => ks.findIndex((k) => names.some((n) => k === n || k.startsWith(n)));
        col = {
          cat: find('allottedcategory', 'allotedcategory', 'consideredcategory'), ccat: find('provisionalconsideredcategory'), course: find('allottedcourse'), seat: find('allottedseat', 'allottesseat'),
          college: find('allottedcollege'), roll: find('neetpgroll'), status: find('status'),
        };
        // the considered category of the stray list sits after "Provisional Considered Category"
        if (col.cat < 0) col.cat = ks.findIndex((k) => k.includes('category'));
        continue;
      }
      if (!col || !/^\d+$/.test(cells[0] ?? '')) continue;
      const get = (i: number) => (i < 0 ? '' : (cells[i] ?? '').replace(/\s+/g, ' ').trim());
      const status = get(col.status);
      bump(statuses, status);
      // later rounds list everyone holding a seat; keep only seats allotted in this round
      if (/^(joined|retained|not ?upgraded|cancel)/i.test(status)) { skipped++; continue; }
      const roll = get(col.roll).replace(/\D/g, '');
      const rank = air.get(roll);
      if (!rank) { noAir++; continue; }
      // some lists split "MD" | "Radiodiagnosis" over two cells, the first under an empty header
      const prev = col.course > 0 && ks[col.course - 1] === '' ? get(col.course - 1) : '';
      const course = `${prev} ${get(col.course)}`.trim();
      const seatKey = `${get(col.college)}|${course.replace(/^(MD|MS)\b\s*/i, '')}|${get(col.seat)}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
      nowHeld.set(roll, seatKey);
      if (held.get(roll) === seatKey) { same++; continue; }
      bump(cats, get(col.cat)); bump(seats, get(col.seat));
      out.push({
        rank, quota: get(col.seat), inService: inService.has(roll), institute: get(col.college), course, allottedCategory: get(col.cat), candidateCategory: get(col.ccat >= 0 ? col.ccat : col.cat),
        remarks: status, page,
      });
    }
  }
  for (const [r, k] of nowHeld) held.set(r, k);
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync(`data/parsed/${file}.json`, JSON.stringify({ source: SITE + id + '.pdf', url: SITE + id + '.pdf', counselling: 'Rajasthan', year: 2025, round: label, rows: out }));
  console.log(`${file}: ${out.length} allotments, ${skipped + same} kept an earlier seat, ${noAir} without an AIR`);
}
console.log('status', Object.fromEntries(statuses));
console.log('categories', Object.fromEntries([...cats].sort((a, b) => b[1] - a[1])));
console.log('seat types', Object.fromEntries([...seats].sort((a, b) => b[1] - a[1])));

// ---- 2024 (rajpgneet2024.org, via its Internet Archive copies; the site no longer exists) ----
// Only the list published after Round 3 was archived ("allotments med for web r3_2024"): every seat held after Round 3,
//   S.No | State Merit No. | Allotted to (Reg. ID) | Gender | Considered category, sub-cat | Name | Course | College (State/Mgmt - Recog | Post MBBS DNB/Diploma)
// so it is published as "Round 3" closing ranks (all seats held after Round 3). Reg. ID → NEET roll and in-service status come from
// the round-wise merit lists, roll → AIR from the NBEMS NEET-PG 2024 result.
{
  const A = 'https://web.archive.org/web/20250317043809/http://rajpgneet2024.org/docs_upd/allotments%20med%20for%20web%20r3_2024.pdf';
  const nb = JSON.parse(readFileSync('data/raw/nbems/neetpg2024_air.json', 'utf8')) as Record<string, [number, number]>;
  const rollOf = new Map<string, string>(), svc24 = new Set<string>();
  for (const f of ['rj2024_merit_r1', 'rj2024_merit_r2', 'rj2024_merit_r3']) {
    let col: Record<string, number> | null = null;
    for await (const { rows } of tables(f)) for (const cells of rows) {
      const ks = cells.map(key);
      if (ks.includes('neetid')) { col = { roll: ks.indexOf('neetid'), reg: ks.findIndex((k) => k.startsWith('regid')), svc: ks.findIndex((k) => k.startsWith('inservice')) }; continue; }
      if (!col || col.reg < 0) continue;
      const roll = (cells[col.roll] ?? '').replace(/\D/g, ''), reg = (cells[col.reg] ?? '').trim();
      if (!/^\d{11}$/.test(roll) || !/^PM\d+$/.test(reg)) continue;
      rollOf.set(reg, roll);
      if (/^in/i.test((cells[col.svc] ?? '').replace(/\W/g, ''))) svc24.add(reg); else svc24.delete(reg);
    }
  }
  const CAT: Record<string, string> = { GEN: 'GENERAL', OBC: 'OBC NCL', MBC: 'MBC NCL', SC: 'SC', ST: 'ST', EWS: 'EWS' };
  // 2024 college spellings → spellings whose letters-only key matches the 2025 table in build-dataset (RJ_CODES)
  const NAME24: Record<string, string> = {
    jlnmedicalcollegeajmer: 'JLN MC, Ajmer', spmedicalcollegebikaner: 'SP MC, Bikaner', rntmedicalcollegeudaipur: 'RNT MC, Udaipur',
    snmedicalcollegejodhpur: 'Dr SN MC, Jodhpur', govtmedicalcollegekota: 'Govt Medical College, Kota', geetanjalimedicalcollegeudaipur: 'Geetanjali Medical College Hospital, Udaipur',
    governmenthospitalbarmer: 'GH Barmer', governmentgeneralhospitalsawaimadhopur: 'GH Sawai Madhopur', govtbdkhospitaljhunjhunu: 'Government BDK Hospital, Jhunjhunu',
    govermentdistricthospitalbundi: 'DH Bundi', jlngovernmenthospitalnagaur: 'DH Nagaur', generalhospitalkarauli: 'GH Karauli', districthospitalbaran: 'DH Baran',
    govtdistrictsaadathospitaltonk: 'DH Tonk', mgmgovtdistricthospitalhanumangarhtown: 'DH Hanumangarh', mahatmagandhihospitalbhilwara: 'MGH Bhilwara',
    govtdistrictcivilhospitalsuratgarhroadsriganganagarrajasthan: 'DH Sriganganagar', ssggovernmentdistricthospitalchittorgarh: 'DH Chittorgarh',
    rajivgandhigovernmentgeneralhospitalprincipalmedicalofficergeneralhospitalalwar: 'Government Hospital, Alwar',
    governmentmedicalcollegeandbangurhospitalpali: 'GMC Pali', govtmedicalcollegebharatpur: 'GMC Bharatpur',
    governmentmedicalcollegeandassociatedgroupofhospitalsshriharidevjoshihospitaldungarpur: 'GMC Dungarpur',
    ruhscollegeofmedicalsciencesjaipur: 'RUHS College of Medical Sciences', govtrdbpjaipuriyahospitaljaipur: 'Govt RDBP Jaipuria Hospital, Jaipur',
    districthospitalpratapgarh: 'DH Pratapgarh', districthospitalsirohi: 'DH Sirohi', shriramkaranjoshigovernmentdistricthospitaldausa: 'DH Dausa',
    rkgovtdistricthospitalrajsamand: 'DH Rajsamand', govtamritkaurhospitalbeawarajmer: 'Govt Amrit Kaur Hospital Beawar',
  };
  const GMC_BHARATPUR = 'Shri Jagannath Pahadiya Medical College Bharatpur or GMC Bharatpur';
  const out: any[] = [];
  let noAir = 0;
  for await (const { page, rows } of tables('rj2024_r3')) for (const c of rows) {
    if (!/^\d+$/.test(c[0] ?? '') || !/^PM\d+$/.test((c[2] ?? '').trim())) continue;
    const reg = c[2].trim(), roll = rollOf.get(reg), rank = roll ? nb[roll]?.[0] : undefined;
    if (!rank) { noAir++; continue; }
    const college = (c[7] ?? '').replace(/\s+/g, ' ').trim(), kind = college.match(/\(([^()]*)\)\s*$/)?.[1] ?? '';
    const cat = CAT[(c[4] ?? '').split(/[\s-]/)[0].toUpperCase()] ?? (c[4] ?? '').trim();
    const name = college.replace(/\s*\([^()]*\)\s*$/, ''), nk = key(name);
    const inst = nk === 'gmcbharatpur' || nk === 'govtmedicalcollegebharatpur' ? GMC_BHARATPUR : NAME24[nk] ?? name;
    let course = (c[6] ?? '').replace(/\s+/g, ' ').trim().replace(/^MD\s*\(?PSM\)?$/i, 'MD (Community Medicine)').replace(/\bGen\.\s*/g, 'General ');
    if (!/^Post MBBS/i.test(course)) course = (/Diploma/i.test(kind) ? 'Post MBBS Diploma ' : /DNB/i.test(kind) ? 'Post MBBS DNB ' : '') + course;
    out.push({ rank, quota: /^Mgmt/i.test(kind) ? 'Management' : 'State', inService: svc24.has(reg), institute: inst,
      course,
      allottedCategory: cat, candidateCategory: cat, remarks: 'seat held after Round 3', page });
  }
  out.sort((a, b) => a.rank - b.rank);
  writeFileSync('data/parsed/rj2024_r3.json', JSON.stringify({ source: A, url: A, counselling: 'Rajasthan', year: 2024, round: 'Round 3', rows: out }));
  console.log(`rj2024_r3: ${out.length} seats held after Round 3 (${rollOf.size} reg. IDs mapped, ${noAir} without an AIR)`);
}
