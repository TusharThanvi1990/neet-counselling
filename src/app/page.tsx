import Link from 'next/link';
import { ArrowIcon, CheckIcon } from '@/components/Icons';
import { getData, latestFullYear } from '@/lib/data';
import { cutoffs, CATEGORIES } from '@/lib/query';
import { fmt } from '@/lib/url';

const TOOLS = [
  { href: '/rank-scan', n: '02 · SCAN', title: 'Rank Scan', text: 'What every rank near yours was allotted in each round, upgrades included.' },
  { href: '/cutoffs', n: '03 · CUTOFFS', title: 'Closing-rank trends', text: 'Opening and closing ranks per branch, quota and category, season by season.' },
  { href: '/seat-matrix?view=changes', n: '04 · SEATS', title: 'Seat matrix and seat increase', text: 'Seats per college and branch, and where seats were added or cut this year.' },
  { href: '/institutes', n: '05 · MONEY', title: 'Fees, stipend and bond', text: 'Tuition per year, monthly stipend, hostel and the service-bond rules of 18 states.' },
  { href: '/eligibility', n: '06 · ELIGIBLE', title: 'Quota eligibility', text: 'Which counsellings and quotas you can apply for, from your domicile and MBBS state.' },
  { href: '/score-to-rank', n: '07 · RANK', title: 'Score to rank', text: 'Your NEET PG score as an All India Rank, from the full NBEMS results.' },
  { href: '/compare', n: '08 · COMPARE', title: 'Compare colleges', text: 'Two to four colleges side by side: cutoffs, seats, fees, stipend and bond.' },
  { href: '/my-list', n: '09 · LIST', title: 'Smart choice list', text: 'Build a choice list from the predictor in one click, reorder it and print it as PDF.' },
];

export default function Home() {
  const d = getData();
  const year = latestFullYear(d);
  const top = cutoffs(year, 'main', 'all-india', 'Open', 'MD/MS').rows
    .filter((r) => ['General Medicine (MD/MS)', 'Radiodiagnosis (MD/MS)', 'Dermatology (MD/MS)', 'Paediatrics (MD/MS)', 'General Surgery (MD/MS)', 'Obstetrics & Gynaecology (MD/MS)'].includes(r.branch));
  const counsellings = [...new Set(d.rounds.map((r) => r.counselling))];
  const states = counsellings.filter((c) => c !== 'MCC').sort();
  const latest = Math.max(...d.years), first = Math.min(...d.years);

  const faq: [string, string][] = [
    ['Where does the data come from?', 'Every number comes from documents the counselling authorities publish: MCC and state round-wise allotment results, seat matrices, institute profiles and fee notifications. Each closing rank links to the page of the official PDF it came from.'],
    ['How accurate is the college predictor?', 'It compares your rank with the last rank actually allotted for each seat in past rounds. Cutoffs move every year with seats and competition, so treat Safer, Possible and Reach as a guide, not a guarantee.'],
    ['Which state counsellings are covered?', `MCC (All India Quota, deemed and central universities, DNB) and ${states.length} state counsellings: ${states.join(', ')}. Ranks that a state prints as its own merit number or roll number are converted to All India Rank through the NBEMS result.`],
    ['Which rounds are included?', `Every round from ${first} onwards, stray and special stray rounds included, and ${latest} rounds as they are published.`],
  ];

  return (
    <>
      <section className="hero">
        <div className="container">
          <div>
            <span className="eyebrow">NEET PG {latest} · Round 1 results in</span>
            <h1>Know where your rank lands before you fill a single choice.</h1>
            <p className="big">Closing ranks, seats, fees, stipends and bonds for MCC and {states.length} state counsellings, read from every official result PDF since {first}.</p>
            <div className="trust">
              <span><CheckIcon size={18} /> Every rank links to its PDF page</span>
              <span><CheckIcon size={18} /> MCC + state quotas in one list</span>
            </div>
          </div>
          <form className="card hero-card" action="/predictor" method="get">
            <h2>Check your chances</h2>
            <label className="field"><span>NEET PG All India Rank</span>
              <input name="rank" type="number" min={1} inputMode="numeric" placeholder="e.g. 14500" required /></label>
            <div className="row">
              <label className="field"><span>Category</span>
                <select name="cat" defaultValue="General">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="field"><span>Course</span>
                <select name="program" defaultValue=""><option value="">All</option><option>MD/MS</option><option>DNB</option><option>Diploma</option></select></label>
            </div>
            <label className="check"><input type="checkbox" name="pwd" value="1" /> I am a PwD candidate</label>
            <button className="btn accent lg block" type="submit">Show my colleges <ArrowIcon size={18} /></button>
            <span className="note" style={{ textAlign: 'center' }}>Compared with {year} Rounds 1–3</span>
          </form>
        </div>
      </section>

      <div className="container">
        <div className="statstrip">
          <div><div className="v">{fmt(d.n)}</div><div className="k">allotments read from result PDFs</div></div>
          <div><div className="v">{fmt(d.codes.length)}</div><div className="k">colleges and DNB hospitals</div></div>
          <div><div className="v">{counsellings.length}</div><div className="k">counsellings: MCC and {states.length} states</div></div>
          <div><div className="v">{first}–{String(latest).slice(2)}</div><div className="k">every round, stray rounds included</div></div>
        </div>
      </div>

      <section className="band">
        <div className="container">
          <div className="section-head">
            <h2>Every tool a counselling season needs</h2>
            <p>From the first shortlist to the final locked choice list, without opening a single 900-page PDF.</p>
          </div>
          <div className="bento">
            <Link href="/predictor" className="lead">
              <span className="n">01 · PREDICT</span>
              <h3>College predictor</h3>
              <p>Every seat your rank reached last year across MCC and your state, marked Safer, Possible or Reach, with the fee on the same row.</p>
              <span className="go">Open predictor →</span>
            </Link>
            {TOOLS.map((t) => (
              <Link key={t.href} href={t.href}>
                <span className="n">{t.n}</span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band ink">
        <div className="container split">
          <div>
            <span className="kicker">Traceable by design</span>
            <h2>Don’t trust a number you can’t check.</h2>
            <p>Each closing rank opens the official result PDF at the exact page it came from. Ranks printed as state merit numbers or roll numbers are converted to All India Rank through the NBEMS result.</p>
            <p style={{ marginTop: 22 }}><Link className="btn accent" href="/cutoffs">See all branch cutoffs <ArrowIcon size={18} /></Link></p>
          </div>
          <div className="tablebox">
            <table>
              <thead><tr><th>Branch · AIQ · Open</th><th className="num">First rank</th><th className="num">Closing {year}</th></tr></thead>
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
            {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
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
