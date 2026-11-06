/**
 * Quota eligibility from a candidate's background. MCC quotas follow MCC's published rules; state quotas are
 * judged from what kind of quota each one is (its label says "State Quota", "Management", "NRI", "In-service",
 * "Institutional", "open to all" …). State domicile rules differ, so state answers are "likely" or "check", never final.
 */
import { getData } from './data';
import { STATE_NAMES, quotaState } from './query';

export type Verdict = 'yes' | 'likely' | 'check' | 'no';
export const VERDICT_LABEL: Record<Verdict, string> = { yes: 'Eligible', likely: 'Likely eligible', check: 'Check the brochure', no: 'Not eligible' };

export const MBBS_UNIS = [
  { id: '', label: 'Another university' },
  { id: 'du', label: 'University of Delhi (DU)' },
  { id: 'ipu', label: 'GGS Indraprastha University (IPU)' },
  { id: 'bhu', label: 'Banaras Hindu University (BHU)' },
  { id: 'amu', label: 'Aligarh Muslim University (AMU)' },
] as const;
export const MINORITIES = ['', 'Muslim', 'Jain', 'Christian', 'Sikh', 'Hindu (J&K)', 'Other'] as const;

export type Background = { domicile: string; mbbsState: string; uni: string; nri: boolean; inService: string; afms: boolean; minority: string };

export function parseBackground(sp: Record<string, string | string[] | undefined>): Background {
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const all = new Set([...STATE_NAMES, ...getData().states]);
  const st = (k: string) => (all.has(one(k)) ? one(k) : '');
  return {
    domicile: st('domicile'), mbbsState: st('mbbs'), uni: MBBS_UNIS.some((u) => u.id === one('uni')) ? one('uni') : '',
    nri: one('nri') === '1', inService: st('service'), afms: one('afms') === '1',
    minority: (MINORITIES as readonly string[]).includes(one('minority')) ? one('minority') : '',
  };
}

export type Row = { quotaId: string; quota: string; verdict: Verdict; why: string };

function mcc(b: Background, id: string): [Verdict, string] | null {
  switch (id) {
    case 'all-india': return ['yes', 'Open to every Indian MBBS graduate who qualified NEET PG.'];
    case 'dnb-quota': return ['yes', 'DNB seats in MCC counselling are open to all qualified candidates.'];
    case 'self-financed-merit-seat': return ['yes', 'Deemed university merit seats are open to all; fees are much higher.'];
    case 'non-resident-indian': return b.nri ? ['yes', 'You marked yourself NRI or NRI-sponsored (documents are verified at admission).'] : ['no', 'Only for NRI candidates and NRI-sponsored wards.'];
    case 'delhi-university-quota': return b.uni === 'du' ? ['yes', 'Internal quota for MBBS graduates of the University of Delhi.'] : ['no', 'Only for MBBS graduates of the University of Delhi.'];
    case 'ip-university-quota': return b.uni === 'ipu' ? ['yes', 'Internal quota for MBBS graduates of GGS IP University.'] : ['no', 'Only for MBBS graduates of GGS IP University.'];
    case 'banaras-hindu-university': return b.uni === 'bhu' ? ['yes', 'Internal quota for BHU MBBS graduates.'] : ['no', 'Only for MBBS graduates of BHU.'];
    case 'aligarh-muslim-university': return b.uni === 'amu' ? ['yes', 'Internal quota for AMU MBBS graduates.'] : ['no', 'Only for MBBS graduates of AMU.'];
    case 'muslim-minority-quota': return b.minority === 'Muslim' ? ['likely', 'For Muslim candidates at minority institutions (e.g. Jamia Millia Islamia).'] : ['no', 'Only for Muslim candidates.'];
    case 'jain-minority-quota': return b.minority === 'Jain' ? ['likely', 'For Jain candidates at Jain minority institutions.'] : ['no', 'Only for Jain candidates.'];
    case 'armed-forces-medical': return b.afms ? ['yes', 'You marked yourself an Armed Forces Medical Services candidate.'] : ['no', 'Only for Armed Forces Medical Services candidates.'];
    default: return null;
  }
}

function stateQuota(b: Background, state: string, label: string): [Verdict, string] {
  const l = label.toLowerCase();
  const dom = b.domicile === state, mbbs = b.mbbsState === state;
  if (l.includes('open to all')) return ['yes', 'Open to candidates from any state.'];
  if (/\(open\)/.test(l)) return dom || mbbs ? ['likely', 'Seats outside institutional preference; you have a link to this state.'] : ['check', 'Seats outside institutional preference; whether other states can apply depends on the brochure.'];
  if (l.includes('nri')) return b.nri ? ['likely', 'NRI seats in this state; check its NRI documents.'] : ['no', 'Only for NRI candidates and NRI-sponsored wards.'];
  if (l.includes('in-service')) return b.inService === state ? ['likely', `For doctors in ${state} government service.`] : ['no', `Only for doctors in ${state} government service.`];
  if (l.includes('minority')) return b.minority ? ['check', 'Needs a minority certificate for the community the college serves.'] : ['no', 'Only for candidates of the community the college serves.'];
  if (l.includes('management')) return ['check', 'Management seats are usually open to all states, at a higher fee. Confirm in the brochure.'];
  if (l.includes('institutional') || l.includes('university quota') || l.includes('local') || l.includes('graduates')) {
    return mbbs ? ['likely', `For MBBS graduates of ${state} colleges (some are limited to one university).`] : ['no', `Only for MBBS graduates of ${state} colleges.`];
  }
  // State quota / government / private (state quota)
  if (dom && mbbs) return ['likely', `You are domiciled in ${state} and did MBBS there.`];
  if (dom || mbbs) return ['check', `You ${dom ? 'are domiciled in' : 'did MBBS in'} ${state}. Some states need both, some need only one.`];
  return ['no', `For candidates domiciled in ${state} or with an MBBS from ${state}.`];
}

export function eligibility(b: Background) {
  const d = getData();
  const mccRows: Row[] = [];
  const states = new Map<string, Row[]>();
  for (const q of d.quota) {
    const st = quotaState(d.quota.indexOf(q));
    if (!st) {
      const v = mcc(b, q.id);
      if (v) mccRows.push({ quotaId: q.id, quota: q.label, verdict: v[0], why: v[1] });
      continue;
    }
    const [verdict, why] = stateQuota(b, st, q.label);
    states.set(st, [...(states.get(st) ?? []), { quotaId: q.id, quota: q.label, verdict, why }]);
  }
  const rank: Record<Verdict, number> = { yes: 0, likely: 1, check: 2, no: 3 };
  const stateRows = [...states].map(([state, rows]) => ({ state, rows: rows.sort((a, b) => rank[a.verdict] - rank[b.verdict]) }))
    .map((s) => ({ ...s, best: s.rows[0]?.verdict ?? 'no' as Verdict }))
    .sort((a, b) => rank[a.best] - rank[b.best] || a.state.localeCompare(b.state));
  const usable = [...mccRows, ...stateRows.flatMap((s) => s.rows)].filter((r) => r.verdict === 'yes' || r.verdict === 'likely').map((r) => r.quotaId);
  return { mccRows, stateRows, usable };
}
