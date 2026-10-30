import type { Metadata } from 'next';
import Link from 'next/link';
import AutoForm from '@/components/AutoForm';
import { getData } from '@/lib/data';
import { INSTITUTE_TYPES, listInstitutes, MATRIX_PAGE, type InstituteSort } from '@/lib/institutes';
import { fmt, hrefWith, type SearchParams } from '@/lib/url';

export const metadata: Metadata = { title: 'Institutes & fees' };

const rupees = (n: number | null) => (n == null ? '—' : `₹${fmt(n)}`);

export default async function InstitutesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const d = getData();
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const sort = (['name', 'stipend', 'fee', 'seats'].includes(str('sort')) ? str('sort') : 'name') as InstituteSort;
  const page = Math.max(1, parseInt(str('page'), 10) || 1);
  const res = listInstitutes({ q: str('q'), state: str('state'), type: str('type'), sort, page });
  const pages = Math.max(1, Math.ceil(res.count / MATRIX_PAGE));
  const withProfile = Object.keys(d.profiles).length;

  return (
    <>
      <h1>Institutes, fees and stipends</h1>
      <p className="lede">
        Every institute in MCC’s seat matrices, with the first-year fee and stipend each one declared to MCC for {Math.max(...d.years)} counselling
        ({fmt(withProfile)} institutes have a profile). Open an institute for its full fee schedule, resignation rules, seats and closing ranks.
      </p>

      <AutoForm className="panel">
        <div className="fields">
          <label className="field"><span>Institute</span><input type="search" name="q" defaultValue={str('q')} placeholder="Name or MCC code" /></label>
          <label className="field"><span>State</span>
            <select name="state" defaultValue={str('state')}><option value="">All states</option>{d.states.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="field"><span>Type</span>
            <select name="type" defaultValue={str('type')}><option value="">All types</option>{INSTITUTE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="field"><span>Sort</span>
            <select name="sort" defaultValue={sort}>
              <option value="name">Name A–Z</option><option value="stipend">Highest stipend</option><option value="fee">Lowest fee</option><option value="seats">Most seats</option>
            </select></label>
        </div>
      </AutoForm>

      <div className="tablebox">
        <table>
          <thead><tr><th>Institute</th><th className="hide-sm">Type</th><th className="num">Seats {res.latest}</th><th className="num hide-sm">Branches</th>
            <th className="num">Fee, year 1</th><th className="num">Stipend, year 1*</th></tr></thead>
          <tbody>
            {res.rows.length ? res.rows.map((r) => (
              <tr key={r.code}>
                <td><div className="inst"><Link href={`/institutes/${r.code}`}>{r.name}</Link></div><div className="sub">{r.state} · MCC code {r.code}</div></td>
                <td className="hide-sm sub">{r.type}</td>
                <td className="num">{r.seats ? fmt(r.seats) : '—'}</td>
                <td className="num hide-sm">{r.branches || '—'}</td>
                <td className="num">{rupees(r.feeY1)}</td>
                <td className="num">{rupees(r.stipendY1)}</td>
              </tr>
            )) : <tr><td colSpan={6} className="empty">No institutes match these filters.</td></tr>}
          </tbody>
        </table>
        <div className="more">
          {page > 1 && <Link className="btn" href={hrefWith('/institutes', sp, { page: page - 1 })}>← Previous</Link>}
          <span>{fmt(res.count)} institutes{pages > 1 ? ` · page ${page} of ${fmt(pages)}` : ''}</span>
          {page < pages && <Link className="btn" href={hrefWith('/institutes', sp, { page: page + 1 })}>Next →</Link>}
        </div>
      </div>
      <p className="note">
        Fees and stipends are as declared by each institute to MCC, in rupees. *Most institutes declare the stipend per month; some write
        separate amounts for MD/MS and diploma, and the first amount is shown here (the institute page shows their exact wording). A dash means not declared.
      </p>
    </>
  );
}
