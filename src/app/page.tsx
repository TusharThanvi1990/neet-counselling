import Link from 'next/link';
import AutoForm from '@/components/AutoForm';
import AddButton from '@/components/AddButton';
import { getData, PROGRAMS, ROUND_SETS, yearLabel } from '@/lib/data';
import { BAND_LABEL, CATEGORIES, parseProfile, predict, type Band, type SortKey } from '@/lib/query';
import { fmt, hrefWith, type SearchParams } from '@/lib/url';

export default async function PredictorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const p = parseProfile(sp);
  const band = (['safe', 'possible', 'reach'].includes(String(sp.band)) ? sp.band : 'all') as Band | 'all';
  const sort = (['close', 'margin', 'inst'].includes(String(sp.sort)) ? sp.sort : 'close') as SortKey;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const limit = Math.min(2000, Math.max(100, Number(sp.limit) || 100));
  const res = predict(p, { band, q, sort, limit });
  const total = res.counts.safe + res.counts.possible + res.counts.reach;
  const branches = [...d.course].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>Where ranks like yours were allotted</h1>
      <p className="lede">
        Each option compares your All India Rank with the last rank MCC allotted to that seat in the season you pick.
        These are past results, not a guarantee.
      </p>

      <AutoForm className="panel">
        <input type="hidden" name="quotas" value="1" />
        <div className="fields">
          <label className="field"><span>All India Rank</span>
            <input className="rank" name="rank" type="number" min={1} inputMode="numeric" defaultValue={p.rank} /></label>
          <label className="field"><span>Category</span>
            <select name="cat" defaultValue={p.cat}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="check"><input type="checkbox" name="pwd" value="1" defaultChecked={p.pwd} /> PwD</label>
          <label className="field"><span>Compare with</span>
            <select name="year" defaultValue={p.year}>{d.years.map((y) => <option key={y} value={y}>{yearLabel(d, y)}</option>)}</select></label>
          <label className="field"><span>Rounds</span>
            <select name="rounds" defaultValue={p.rounds}>{ROUND_SETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
        </div>
        <hr className="divider" />
        <div className="fields">
          <label className="field"><span>Branch</span>
            <select name="branch" defaultValue={p.branch}><option value="">All branches</option>
              {branches.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label className="field"><span>Program</span>
            <select name="program" defaultValue={p.program}><option value="">All programs</option>{PROGRAMS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="field"><span>State</span>
            <select name="state" defaultValue={p.state}><option value="">All states</option>{d.states.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>Search institute</span>
            <input type="search" name="q" defaultValue={q} placeholder="e.g. Maulana Azad" /></label>
          <label className="field"><span>Sort</span>
            <select name="sort" defaultValue={sort}>
              <option value="close">Most competitive first</option><option value="margin">Best margin first</option><option value="inst">Institute A–Z</option>
            </select></label>
        </div>
        <div className="field">
          <span>Quotas you are eligible for</span>
          <div className="quotas">
            {d.quota.map((x) => (
              <label key={x.id} className="check"><input type="checkbox" name="quota" value={x.id} defaultChecked={p.quotas.includes(x.id)} /> {x.label}</label>
            ))}
          </div>
        </div>
        {band !== 'all' && <input type="hidden" name="band" value={band} />}
      </AutoForm>

      <div className="seg" role="group" aria-label="Filter by chance">
        {([['all', 'All', total], ['safe', 'Safer', res.counts.safe], ['possible', 'Possible', res.counts.possible], ['reach', 'Reach', res.counts.reach]] as const).map(([v, label, n]) => (
          <Link key={v} href={hrefWith('/', sp, { band: v === 'all' ? undefined : v, limit: undefined })} scroll={false} aria-current={band === v}>
            {label} <span className="n">{fmt(n)}</span>
          </Link>
        ))}
      </div>

      <div className="tablebox">
        <table>
          <thead>
            <tr><th>Chance</th><th>Institute</th><th>Branch</th><th className="hide-sm">Quota · seat</th><th className="num">Closing rank</th>
              <th className="num">Your margin</th><th className="num hide-sm">Seats</th><th /></tr>
          </thead>
          <tbody>
            {res.options.length ? res.options.map((o) => (
              <tr key={o.key + o.seatCategory}>
                <td><span className={`pill b-${o.band}`}>{BAND_LABEL[o.band]}</span></td>
                <td><div className="inst" title={o.fullName}>{o.code ? <Link href={`/institutes/${o.code}`}>{o.institute}</Link> : o.institute}</div><div className="sub">{o.state}</div></td>
                <td>{o.branch}</td>
                <td className="hide-sm"><span className="tag">{o.quota}</span> <span className="sub">{o.seatCategory}</span></td>
                <td className="num">{fmt(o.closingRank)}<div className="sub">{o.closingRound} · <a href={o.pdf} target="_blank" rel="noopener">PDF</a></div></td>
                <td className={`num ${o.margin >= 0 ? 'pos' : 'neg'}`}>{o.margin >= 0 ? '+' : '−'}{fmt(Math.abs(o.margin))}</td>
                <td className="num hide-sm">{o.seats ?? '—'}</td>
                <td><AddButton choice={o.key} /></td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="empty">No seats within reach for these filters. Try adding quotas, another branch or state, or a different season.</td></tr>
            )}
          </tbody>
        </table>
        <div className="more">
          {res.total > res.options.length
            ? <>Showing {fmt(res.options.length)} of {fmt(res.total)} <Link className="btn" href={hrefWith('/', sp, { limit: limit + 100 })} scroll={false}>Show 100 more</Link></>
            : res.total ? `${fmt(res.total)} options` : null}
        </div>
      </div>
    </>
  );
}
