import type { Metadata } from 'next';
import Link from 'next/link';
import PageShell from '@/components/PageShell';
import cal from '../../../data/calendar2026.json';

export const metadata: Metadata = { title: 'NEET PG counselling calendar 2026' };
export const revalidate = 3600;

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const span = (from: string, to: string) => (from === to ? fmtDate(from) : `${fmtDate(from)} – ${fmtDate(to)}`);

export default function CalendarPage() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const status = (from: string, to: string) => (today > to ? 'done' : today >= from ? 'now' : 'next');
  const upcoming = cal.mcc.flatMap((r) => r.steps.map((s) => ({ ...s, round: r.round }))).filter((s) => s.to >= today).slice(0, 3);

  return (
    <PageShell
      title={`NEET PG Counselling Calendar ${cal.season}`}
      intro={<>MCC (All India, deemed and central universities) and the common state counselling windows, from MCC’s official schedules. Dates can change; check the <Link href="/notices">latest notices</Link>.</>}
    >
      {upcoming.length > 0 && (
        <div className="card cal-now">
          <h3>Happening now and next</h3>
          <ul>{upcoming.map((s) => (
            <li key={s.round + s.step}><b>{s.round}: {s.step}</b> · {span(s.from, s.to)} {status(s.from, s.to) === 'now' && <span className="tag">open now</span>}</li>
          ))}</ul>
        </div>
      )}

      <h2>MCC counselling</h2>
      <div className="cal-grid">
        {cal.mcc.map((r) => (
          <section key={r.round} className="card">
            <h3>{r.round}</h3>
            <table className="cal-table"><tbody>
              {r.steps.map((s) => (
                <tr key={s.step} className={`cal-${status(s.from, s.to)}`}><td>{s.step}</td><td className="num">{span(s.from, s.to)}</td></tr>
              ))}
            </tbody></table>
          </section>
        ))}
      </div>

      <h2>State counselling (all states)</h2>
      <div className="tablebox">
        <table>
          <thead><tr><th>Round</th><th>State counselling window</th><th>Last date of joining</th></tr></thead>
          <tbody>{cal.state.map((r) => (
            <tr key={r.round} className={`cal-${status(r.from, r.lastJoining)}`}><td>{r.round}</td><td>{span(r.from, r.to)}</td><td>{fmtDate(r.lastJoining)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="sub">Each state sets its own dates inside these windows. PG academic session starts {fmtDate(cal.academicSession)} {cal.season}.</p>
      <p className="sub">Sources: {cal.sources.map((s, i) => <span key={s.url}>{i ? ' · ' : ''}<a href={s.url} target="_blank" rel="noopener">{s.label}</a></span>)}</p>
    </PageShell>
  );
}
