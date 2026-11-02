import Link from 'next/link';
import { ArrowIcon, BuildingIcon, ChartIcon, CheckIcon, GridIcon, ListIcon, ScanIcon, TargetIcon } from '@/components/Icons';
import { getData, latestFullYear } from '@/lib/data';
import { cutoffs, CATEGORIES } from '@/lib/query';
import { fmt } from '@/lib/url';

const FEATURES = [
  { href: '/predictor', icon: <TargetIcon />, title: 'College Predictor', text: 'Enter your rank and category to see every MCC seat within reach, marked Safer, Possible or Reach.' },
  { href: '/cutoffs', icon: <ChartIcon />, title: 'Branch Cutoffs', text: 'Opening and closing ranks for every branch, quota and category, compared across seasons.' },
  { href: '/institutes', icon: <BuildingIcon />, title: 'Colleges, Fees & Stipend', text: 'Fees, stipend, hostel and resignation rules for each college, with its seats and cutoffs by year.' },
  { href: '/seat-matrix', icon: <GridIcon />, title: 'Seat Matrix', text: 'Seats per college and branch for each season, and where seats were added or cut this year.' },
  { href: '/rank-scan', icon: <ScanIcon />, title: 'Rank Scan', text: 'See what candidates around your rank were allotted in every round, including upgrades.' },
  { href: '/my-list', icon: <ListIcon />, title: 'Choice List Builder', text: 'Save colleges as you browse, arrange them in your order of preference and copy the list.' },
];

const FAQ = [
  ['Where does the data come from?', 'Every number comes from documents MCC publishes: round-wise allotment results, seat matrices and institute profiles. Each closing rank links to the page of the official PDF it came from.'],
  ['How accurate is the college predictor?', 'It compares your rank with the last rank MCC actually allotted for each seat in past rounds. Cutoffs move every year with seats and competition, so treat the labels as a guide, not a guarantee.'],
  ['Does it cover state quota counselling?', 'Maharashtra and Karnataka state counselling 2025 are included, with every allotment shown by All India Rank. More states are being added. MCC counselling (All India Quota, deemed and central universities, DNB) is fully covered.'],
  ['Is it free?', 'Yes, all tools are free to use during the current season.'],
  ['Which rounds are included?', 'Rounds 1–3 and the stray rounds from 2023, 2024 and 2025, plus 2026 rounds as MCC publishes them.'],
];

export default function Home() {
  const d = getData();
  const year = latestFullYear(d);
  const top = cutoffs(year, 'main', 'all-india', 'Open', 'MD/MS').rows
    .filter((r) => ['General Medicine (MD/MS)', 'Radiodiagnosis (MD/MS)', 'Dermatology (MD/MS)', 'Paediatrics (MD/MS)', 'General Surgery (MD/MS)', 'Obstetrics & Gynaecology (MD/MS)'].includes(r.branch));
  const totalSeats = d.matrixSources.filter((m) => m.year === Math.max(...d.years)).reduce((s, m) => s + m.seats, 0);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <span className="eyebrow">NEET PG {Math.max(...d.years)} counselling · Updated with MCC Round 1</span>
            <h1>Find the PG seat your <em>NEET rank</em> can get</h1>
            <p className="big">College predictor, cutoffs, seat matrix and fees for MCC counselling, built on {d.years.length} years of official allotment results.</p>
            <div className="trust">
              <span><CheckIcon size={18} /> Official MCC data</span>
              <span><CheckIcon size={18} /> Every round since 2023</span>
              <span><CheckIcon size={18} /> Free to use</span>
            </div>
          </div>
          <form className="card hero-card" action="/predictor" method="get">
            <h2>Check your chances</h2>
            <label className="field"><span>Your NEET PG All India Rank</span>
              <input name="rank" type="number" min={1} inputMode="numeric" placeholder="e.g. 12500" required /></label>
            <div className="row">
              <label className="field"><span>Category</span>
                <select name="cat" defaultValue="General">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field"><span>Program</span>
                <select name="program" defaultValue=""><option value="">All</option><option>MD/MS</option><option>DNB</option><option>Diploma</option></select></label>
            </div>
            <label className="check"><input type="checkbox" name="pwd" value="1" /> I am a PwD candidate</label>
            <button className="btn accent lg block" type="submit">Show my colleges <ArrowIcon size={18} /></button>
            <span className="note" style={{ textAlign: 'center' }}>Compared with {year} MCC Rounds 1–3</span>
          </form>
        </div>
      </section>

      <div className="container">
        <div className="statstrip">
          <div><div className="v">{fmt(d.n)}</div><div className="k">allotments analysed</div></div>
          <div><div className="v">{fmt(d.codes.length)}</div><div className="k">colleges & hospitals</div></div>
          <div><div className="v">{fmt(totalSeats)}</div><div className="k">seats in {Math.max(...d.years)} MCC matrix</div></div>
          <div><div className="v">{d.rounds.length}</div><div className="k">counselling rounds</div></div>
        </div>
      </div>

      <section className="band">
        <div className="container">
          <div className="section-title">
            <h2>Everything you need for MCC counselling</h2>
            <p>From your first shortlist to the final choice list, without digging through hundreds of PDF pages.</p>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <Link key={f.href} href={f.href} className="card feature">
                <span className="icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <span className="go">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band white">
        <div className="container">
          <div className="section-title">
            <h2>How it works</h2>
            <p>Three steps from rank to a ready choice list.</p>
          </div>
          <div className="steps">
            <div className="card step"><h3>Enter your rank</h3><p>Add your All India Rank, category and the quotas you are eligible for.</p></div>
            <div className="card step"><h3>See your options</h3><p>Every college and branch whose closing rank was near yours, with seats, fees and the source PDF.</p></div>
            <div className="card step"><h3>Build your list</h3><p>Save options, put them in your order of preference and take the list into MCC choice filling.</p></div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container split">
          <div>
            <h2>Closing ranks you can verify</h2>
            <p>We read MCC’s result PDFs line by line, so every cutoff is an actual allotment, not an estimate. Click any closing rank to open the exact page of the official PDF.</p>
            <ul className="checks">
              <li><CheckIcon size={18} /> Round-wise MCC results for 2023, 2024, 2025 and 2026</li>
              <li><CheckIcon size={18} /> Maharashtra and Karnataka state counselling, every 2025 round</li>
              <li><CheckIcon size={18} /> Seat matrices with year-on-year seat changes</li>
              <li><CheckIcon size={18} /> Fees and stipends declared by colleges to MCC</li>
            </ul>
            <p style={{ marginTop: 22 }}><Link className="btn primary" href="/cutoffs">See all branch cutoffs <ArrowIcon size={18} /></Link></p>
          </div>
          <div className="tablebox">
            <table>
              <thead><tr><th>Branch (AIQ, Open)</th><th className="num">First rank</th><th className="num">Closing rank {year}</th></tr></thead>
              <tbody>
                {top.map((r) => (
                  <tr key={r.branchId}><td><b>{r.branch.replace(' (MD/MS)', '')}</b><div className="sub">MD/MS</div></td>
                    <td className="num">{fmt(r.open)}</td><td className="num"><b>{fmt(r.close)}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="band white">
        <div className="container">
          <div className="section-title"><h2>Frequently asked questions</h2></div>
          <div className="faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container">
          <div className="cta">
            <div>
              <h2>Ready to plan your choices?</h2>
              <p>Start with your rank. It takes less than a minute.</p>
            </div>
            <Link className="btn accent lg" href="/predictor">Open College Predictor <ArrowIcon size={18} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
