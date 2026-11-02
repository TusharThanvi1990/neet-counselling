import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import { getData } from '@/lib/data';
import { fmt } from '@/lib/url';

export const metadata: Metadata = { title: 'Sources & method' };

export default function SourcesPage() {
  const d = getData();
  const withState = d.inst.filter((i) => i.state).length;
  const stats: [string, string][] = [
    [fmt(d.n), 'allotments'], [String(d.rounds.length), 'result PDFs'], [String(d.years.length), 'seasons'],
    [String(d.course.length), 'branches'], [`${Math.round((withState / d.inst.length) * 100)}%`, 'institutes with a state'],
  ];

  return (
    <PageShell title="Data Sources & Method" intro={<>All figures come from MCC’s official result PDFs. Nothing is estimated or bought from a third party.</>}>

      <div className="stats">
        {stats.map(([v, k]) => <div key={k} className="stat"><div className="v">{v}</div><div className="k">{k}</div></div>)}
      </div>
      <div className="tablebox">
        <table>
          <thead><tr><th>Season</th><th>Counselling</th><th>Round</th><th className="num">Allotments</th><th>Official PDF</th></tr></thead>
          <tbody>
            {[...d.rounds].reverse().map((r) => (
              <tr key={r.id}><td>{r.year}</td><td>{r.counselling}</td><td>{r.label}</td><td className="num">{fmt(r.count)}{r.kind ? ` ${r.kind}` : ''}</td>
                <td><a href={r.url} target="_blank" rel="noopener">Open PDF</a></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Seat matrices</h2>
      <div className="tablebox">
        <table>
          <thead><tr><th>Season</th><th>Matrix</th><th className="num">Seats</th><th>Official PDF</th></tr></thead>
          <tbody>
            {[...d.matrixSources].sort((a, b) => b.year - a.year).map((m) => (
              <tr key={m.url}><td>{m.year}</td><td>{m.kind}</td><td className="num">{fmt(m.seats)}</td>
                <td><a href={m.url} target="_blank" rel="noopener">Open PDF</a></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Institute profiles</h2>
      <p className="prose">
        Fees, stipends, hostel facilities and resignation rules come from each institute’s profile on MCC’s{' '}
        <a href={d.profileSource} target="_blank" rel="noopener">View Institute Profile</a> report ({fmt(Object.keys(d.profiles).length)} institutes,
        current season). Officials’ names and phone numbers in those profiles are not stored.
      </p>
      <div className="prose">
        <h2>How the data was extracted</h2>
        <ol>
          <li>Final result PDFs were downloaded from <a href={d.meta.portal} target="_blank" rel="noopener">MCC’s PG counselling page</a> and its <a href={d.meta.archive} target="_blank" rel="noopener">archive</a>.</li>
          <li>The NamahaPDF engine read each page’s text and the table’s ruling lines, turning sideways pages upright first. Every cell was rebuilt from the table grid, so long names that wrap across lines stay in one cell.</li>
          <li>Round 2 and Round 3 results repeat earlier rounds side by side. Only seats allotted in that round are counted for it; candidates who kept an earlier seat are not double-counted.</li>
          <li>Branch names are standardised across years, for example “M.D. (GENERAL MEDICINE)” and “M.D. General Medicine” both become General Medicine (MD/MS).</li>
          <li>Seat matrices print MCC’s 6-digit institute code after every institute name. That code links an institute across seasons, and allotments are linked to it by name.</li>
        </ol>
        <h2>How chances are labelled</h2>
        <ul>
          <li><span className="pill b-safe">Safer</span> your rank is at least 10% better than the closing rank.</li>
          <li><span className="pill b-possible">Possible</span> your rank is within 10% better to 5% worse than the closing rank.</li>
          <li><span className="pill b-reach">Reach</span> your rank is 5–30% worse than the closing rank.</li>
        </ul>
        <p>
          The closing rank is the highest rank allotted that seat in the rounds you choose. Stray rounds are left out by default
          because they fill leftover seats at very high ranks and would make everything look safe.
        </p>
        <h2>Current limits</h2>
        <ul>
          <li>MCC counselling (All India, deemed, central universities, DNB) plus state counselling 2025 for Maharashtra, Karnataka, Kerala, Andhra Pradesh, Rajasthan, Telangana, Gujarat, Madhya Pradesh and Bihar (2026 Round 1 too for Gujarat and Madhya Pradesh), and Haryana Round 1 2025. Other states are being added.</li>
          <li>Maharashtra lists show the state merit number; the All India Rank comes from the State CET Cell’s Common State Merit List.</li>
          <li>Karnataka (KEA) lists print the All India Rank directly. Private colleges in Karnataka do not take part in MCC counselling, so they have no MCC fee profile.</li>
          <li>Kerala (CEE) lists print the All India Rank. For Kerala’s in-service quotas we show the All India Rank; CEE ranks those seats on its separate service list.</li>
          <li>Andhra Pradesh (Dr NTR UHS) publishes only the last (closing) All India Rank for each seat type and round, not every allotment, so its rows are closing ranks.</li>
          <li>Rajasthan lists give the state merit number and NEET roll number; the All India Rank comes from the board’s State Merit Lists. In-service doctors get bonus marks on the state merit list, so their allotments are shown under a separate “In-service (bonus marks)” quota.</li>
          <li>Telangana (KNRUHS) lists print the All India Rank. Women-only seats are shown with the general seats of the same category.</li>
          <li>Gujarat (ACPPGMEC) lists print the All India Rank. “University Quota” seats are reserved for graduates of the same university.</li>
          <li>Madhya Pradesh (DME MP) lists print the All India Rank. “MP graduates” seats in private colleges are reserved for doctors who did MBBS in Madhya Pradesh; the 2025 mop-up list is no longer linked on the DME site, so it comes from Medical Dialogues’ copy of the official PDF.</li>
          <li>Haryana (DMER) lists print the All India Rank. Only Round 1 of 2025 is available: the counselling portal was reset for 2026, so it comes from Collegedunia’s copy of the portal’s PDF. “In-service” seats are for Haryana Government doctors; “institutional preference” seats are for doctors who did MBBS in Haryana.</li>
          <li>Bihar (BCECEB) lists print the All India Rank. Round 1 of 2025 was withdrawn and re-issued and is no longer on the board’s site, so Bihar starts at Round 2. “BC Women (RCG)” seats are reserved for backward-class women; women-only seats are shown with the general seats of the same category.</li>
          <li>{Math.max(...d.years)} has {d.rounds.filter((r) => r.counselling === 'MCC' && r.year === Math.max(...d.years)).map((r) => r.label).join(', ')} so far.</li>
          <li>Institute names change between years, so each season is compared on its own.</li>
          <li>Fees, stipends and bonds are not included yet.</li>
        </ul>
      </div>
    </PageShell>
  );
}
