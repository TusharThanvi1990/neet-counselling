import type { Metadata } from 'next';
import Link from 'next/link';
import AutoForm from '@/components/AutoForm';
import AddButton from '@/components/AddButton';
import PageShell from '@/components/PageShell';
import SmartListButton from '@/components/SmartListButton';
import { Paywall } from '@/components/Paywall';
import { can, FREE_RESULTS, getAccess } from '@/lib/pro';
import { getData, PROGRAMS, ROUND_SETS, yearLabel } from '@/lib/data';
import { BAND_LABEL, CATEGORIES, STATE_QUOTA, parseProfile, predict, stateCategories, type Band, type SortKey } from '@/lib/query';
import { fmt, hrefWith, type SearchParams } from '@/lib/url';

export const metadata: Metadata = { title: 'NEET PG College Predictor' };

const SMART_MAX = 150;
const FEE_CAPS: [number, string][] = [[50000, 'Up to ₹50,000'], [100000, 'Up to ₹1 lakh'], [200000, 'Up to ₹2 lakh'], [500000, 'Up to ₹5 lakh'], [1000000, 'Up to ₹10 lakh'], [2500000, 'Up to ₹25 lakh']];


export default async function PredictorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const p = parseProfile(sp);
  const band = (['safe', 'possible', 'reach'].includes(String(sp.band)) ? sp.band : 'all') as Band | 'all';
  const sort = (['close', 'margin', 'inst'].includes(String(sp.sort)) ? sp.sort : 'close') as SortKey;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const access = await getAccess();
  const full = can(access, 'pass'), pro = can(access, 'pro');
  const limit = full ? Math.min(2000, Math.max(50, Number(sp.limit) || 50)) : FREE_RESULTS;
  const maxFee = FEE_CAPS.some(([v]) => v === Number(sp.fee)) ? Number(sp.fee) : 0;
  const res = predict(p, { band, q, sort, limit, maxFee });
  const total = res.counts.safe + res.counts.possible + res.counts.reach;
  // Smart list: the top matches across every band, hardest-to-get first (the order choice filling wants).
  const smart = predict(p, { q, sort: 'close', limit: SMART_MAX, maxFee }).options.map((o) => o.key);
  const branches = [...d.course].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <PageShell
      title="NEET PG College Predictor"
      intro="See every MCC seat whose closing rank was near your All India Rank. Based on actual past allotments, so use it as a guide, not a guarantee."
    >
      <div className="tool-layout">
        <AutoForm className="card filters">
          <h3>Your details</h3>
          <input type="hidden" name="quotas" value="1" />
          <label className="field"><span>All India Rank</span>
            <input className="rank" name="rank" type="number" min={1} inputMode="numeric" defaultValue={p.rank} /></label>
          <label className="field"><span>Category</span>
            <select name="cat" defaultValue={p.cat}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="check"><input type="checkbox" name="pwd" value="1" defaultChecked={p.pwd} /> PwD candidate</label>
          <label className="field"><span>State category (for state quota seats)</span>
            <select name="scat" defaultValue={p.scat}><option value="">Same as category above</option>
              {Object.entries(Object.groupBy(stateCategories(), (c) => c.state)).map(([st, cs]) => (
                <optgroup key={st} label={st}>{cs!.map((c) => <option key={c.cat} value={`${st}|${c.cat}`}>{st} · {c.cat}</option>)}</optgroup>
              ))}</select></label>
          <a className="btn primary block jump" href="#results">See {fmt(total)} results ↓</a>
          <hr className="divider" />
          <h3>Filters</h3>
          <label className="field"><span>Branch</span>
            <select name="branch" defaultValue={p.branch}><option value="">All branches</option>
              {branches.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label className="field"><span>Program</span>
            <select name="program" defaultValue={p.program}><option value="">All programs</option>{PROGRAMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="field"><span>State</span>
            <select name="state" defaultValue={p.state}><option value="">All states</option>{d.states.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>Max tuition per year</span>
            <select name="fee" defaultValue={maxFee || ''}><option value="">Any fee</option>{FEE_CAPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="field"><span>College name</span>
            <input type="search" name="q" defaultValue={q} placeholder="Search college" /></label>
          <div className="field">
            <span>MCC quotas you are eligible for</span>
            <div className="quotas">
              {d.quota.filter((x) => !STATE_QUOTA.test(x.label)).map((x) => (
                <label key={x.id} className="check"><input type="checkbox" name="quota" value={x.id} defaultChecked={p.quotas.includes(x.id)} /> {x.label}</label>
              ))}
            </div>
          </div>
          <div className="field">
            <span>State counselling (if you are eligible)</span>
            <div className="quotas">
              {d.quota.filter((x) => STATE_QUOTA.test(x.label)).map((x) => (
                <label key={x.id} className="check"><input type="checkbox" name="quota" value={x.id} defaultChecked={p.quotas.includes(x.id)} /> {x.label}</label>
              ))}
            </div>
          </div>
          <hr className="divider" />
          <h3>Compare with</h3>
          <label className="field"><span>Season</span>
            <select name="year" defaultValue={p.year}>{d.years.map((y) => <option key={y} value={y}>{yearLabel(d, y)}</option>)}</select></label>
          <label className="field"><span>Rounds</span>
            <select name="rounds" defaultValue={p.rounds}>{ROUND_SETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
          {band !== 'all' && <input type="hidden" name="band" value={band} />}
          <input type="hidden" name="sort" value={sort} />
        </AutoForm>

        <div id="results">
          <div className="results-head">
            <div className="count-text"><b>{fmt(total)}</b> colleges & branches for AIR <b>{fmt(p.rank)}</b> ({p.cat}{p.pwd ? ', PwD' : ''})</div>
            {pro
              ? <SmartListButton keys={smart} name={`AIR ${fmt(p.rank)} · ${p.cat}${p.branch ? ` · ${d.course[d.index.course.get(p.branch)!].label}` : ''}`} />
              : <Link className="btn primary" href="/pricing?plan=pro">Build my choice list · Pro</Link>}
            <div className="seg" role="group" aria-label="Sort" style={{ margin: 0 }}>
              {([['close', 'Top colleges'], ['margin', 'Safest first'], ['inst', 'A–Z']] as const).map(([v, label]) => (
                <Link key={v} href={hrefWith('/predictor', sp, { sort: v === 'close' ? undefined : v, limit: undefined })} scroll={false} aria-current={sort === v}>{label}</Link>
              ))}
            </div>
          </div>
          <div className="seg" role="group" aria-label="Filter by chance">
            {([['all', 'All', total], ['safe', 'Safer', res.counts.safe], ['possible', 'Possible', res.counts.possible], ['reach', 'Reach', res.counts.reach]] as const).map(([v, label, n]) => (
              <Link key={v} href={hrefWith('/predictor', sp, { band: v === 'all' ? undefined : v, limit: undefined })} scroll={false} aria-current={band === v}>
                {label} <span className="n">{fmt(n)}</span>
              </Link>
            ))}
          </div>

          <div className="result-list">
            {res.options.length ? res.options.map((o) => (
              <article key={o.key + o.seatCategory} className="card result">
                <div>
                  <h3 className="title" title={o.fullName}>{o.code ? <Link href={`/institutes/${o.code}`}>{o.institute}</Link> : o.institute}</h3>
                  <div className="branch">{o.branch}</div>
                  <div className="meta">
                    <span className={`pill b-${o.band}`}>{BAND_LABEL[o.band]}</span>
                    <span className="tag">{o.quota}</span>
                    <span>{o.seatCategory} seat</span>
                    {o.state && <span>· {o.state}</span>}
                    {o.seats != null && <span>· {o.seats} seat{o.seats === 1 ? '' : 's'}</span>}
                    {o.fee && <span title={`${o.fee.source}, ${o.fee.year}`}>· ₹{fmt(o.fee.fee)} tuition/yr</span>}
                  </div>
                </div>
                <div className="figures">
                  <div className="figure">
                    <div className="v">{fmt(o.closingRank)}</div>
                    <div className="k">Closing rank · {o.closingRound} · <a href={o.pdf} target="_blank" rel="noopener">PDF</a></div>
                  </div>
                  <div className="figure">
                    <div className={`v ${o.margin >= 0 ? 'pos' : 'neg'}`}>{o.margin >= 0 ? '+' : '−'}{fmt(Math.abs(o.margin))}</div>
                    <div className="k">Your margin</div>
                  </div>
                  <div className="actions"><AddButton choice={o.key} /></div>
                </div>
              </article>
            )) : (
              <div className="card empty">No seats within reach for these filters. Try adding quotas, another branch or state, or a different season.</div>
            )}
          </div>
          {!full && res.total > res.options.length && (
            <Paywall need="pass" title={`${fmt(res.total - res.options.length)} more seats match your rank`}
              text={`You are seeing the top ${FREE_RESULTS} of ${fmt(res.total)}. Unlock every match across MCC and all state counsellings, with the fee and state filters, for the whole season.`} />
          )}
          <div className="more">
            {!full ? null : res.total > res.options.length
              ? <>Showing {fmt(res.options.length)} of {fmt(res.total)} <Link className="btn primary" href={hrefWith('/predictor', sp, { limit: limit + 50 })} scroll={false}>Load more colleges</Link></>
              : res.total ? `${fmt(res.total)} results` : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
