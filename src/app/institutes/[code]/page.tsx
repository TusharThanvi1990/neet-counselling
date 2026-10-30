import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { instituteDetail } from '@/lib/institutes';
import { fmt } from '@/lib/url';

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const inst = instituteDetail((await params).code);
  return { title: inst ? inst.name : 'Institute' };
}

const rupees = (n: number | null | undefined) => (n == null ? '—' : `₹${fmt(n)}`);
const yesNo = (b: boolean | null | undefined) => (b == null ? '—' : b ? 'Yes' : 'No');

export default async function InstitutePage({ params }: Params) {
  const inst = instituteDetail((await params).code);
  if (!inst) notFound();
  const p = inst.profile;

  return (
    <>
      <p className="sub" style={{ margin: '0 0 6px' }}><Link href="/institutes">← All institutes</Link></p>
      <h1>{inst.name}</h1>
      <p className="lede">{inst.state} · {inst.type} · MCC institute code {inst.code}{p?.university ? ` · ${p.university}` : ''}</p>

      <h2>Fees and stipend</h2>
      {p ? (
        <>
          <div className="stats">
            <div className="stat"><div className="v">{rupees(p.feeY1 ?? p.annualFee)}</div><div className="k">fee, year 1 (incl. hostel)</div></div>
            <div className="stat"><div className="v">{rupees(p.stipendY1)}</div><div className="k">stipend, year 1 (as declared; usually per month)</div></div>
            <div className="stat"><div className="v">{rupees(p.forfeitOnResign)}</div><div className="k">forfeited if you resign in a later round</div></div>
            <div className="stat"><div className="v">{yesNo(p.hostelMale)} / {yesNo(p.hostelFemale)}</div><div className="k">hostel for men / women</div></div>
          </div>
          <div className="tablebox">
            <table>
              <thead><tr><th /><th className="num">Year 1</th><th className="num">Year 2</th><th className="num">Year 3</th></tr></thead>
              <tbody>
                <tr><td>Fee (incl. hostel)</td><td className="num">{rupees(p.feeY1)}</td><td className="num">{rupees(p.feeY2)}</td><td className="num">{rupees(p.feeY3)}</td></tr>
                <tr><td>Stipend</td><td className="num">{rupees(p.stipendY1)}</td><td className="num">{rupees(p.stipendY2)}</td><td className="num">{rupees(p.stipendY3)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="prose">
            <ul>
              <li>Amount payable at admission: {rupees(p.feeAtAdmission)}; annual fee: {rupees(p.annualFee)}{p.nriFeeY1 ? `; NRI fee, year 1: $${fmt(p.nriFeeY1)}` : ''}.</li>
              <li>Deducted if your seat is re-allotted in Round 2 or 3: {rupees(p.reallocationDeduction)}. Refunded if you resign during counselling: {rupees(p.resignRefund)}.</li>
              {p.notes.length > 0 && <li>As written by the institute: {[...new Set(p.notes)].map((n) => `“${n}”`).join('; ')}</li>}
              {p.website && <li>Website: {p.website}</li>}
            </ul>
            <p className="note">
              As declared by the institute to MCC for the current season (<a href={inst.profileSource} target="_blank" rel="noopener">MCC institute profiles</a>).
              Service bond terms are published separately by MCC and the state; check them before choice filling.
            </p>
          </div>
        </>
      ) : <p className="note">This institute has not published a fee and stipend profile with MCC for the current season.</p>}

      <h2>Seats and closing ranks by branch</h2>
      <p className="note" style={{ marginTop: 0 }}>Seats from MCC’s opening seat matrix; closing ranks for Open seats, Rounds 1–3.</p>
      <div className="tablebox">
        <table>
          <thead>
            <tr><th>Branch</th><th>Quota</th>
              {inst.years.map((y) => <th key={`s${y}`} className="num hide-sm">Seats {y}</th>)}
              {inst.years.map((y) => <th key={`c${y}`} className="num">Closing {y}</th>)}</tr>
          </thead>
          <tbody>
            {inst.programs.length ? inst.programs.map((r, i) => (
              <tr key={i}>
                <td>{r.branch}</td><td><span className="tag">{r.quota}</span></td>
                {r.seats.map((s, j) => <td key={`s${j}`} className="num hide-sm">{s ?? '—'}</td>)}
                {r.closing.map((c, j) => <td key={`c${j}`} className="num">{c == null ? '—' : fmt(c)}</td>)}
              </tr>
            )) : <tr><td colSpan={2 + inst.years.length * 2} className="empty">No seats or allotments recorded for this institute.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
