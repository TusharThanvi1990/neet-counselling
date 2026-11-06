import Link from 'next/link';
import { Logo, TOOLS } from './brand';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <Logo dark />
            <p style={{ margin: 0, maxWidth: 320 }}>
              Closing ranks, seats, fees, stipends and bonds for MCC and state NEET PG counselling, read from the official result PDFs.
            </p>
          </div>
          <div>
            <h4>Data</h4>
            <ul>
              <li><Link href="/predictor">College predictor</Link></li>
              <li><Link href="/cutoffs">Branch cutoffs</Link></li>
              <li><Link href="/allotments">Allotment lists</Link></li>
              <li><Link href="/seat-matrix">Seat matrix</Link></li>
              <li><Link href="/institutes">Colleges & fees</Link></li>
            </ul>
          </div>
          <div>
            <h4>Tools</h4>
            <ul>
              {TOOLS.slice(0, 5).map((t) => <li key={t.href}><Link href={t.href}>{t.label}</Link></li>)}
              <li><Link href="/my-list">My choice list</Link></li>
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li><Link href="/calendar">Counselling calendar</Link></li>
              <li><Link href="/notices">Official notices</Link></li>
              <li><Link href="/sources">Data sources & method</Link></li>
              <li><a href="https://mcc.nic.in/pg-medical-counselling/" target="_blank" rel="noopener">MCC official website</a></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} neetpgcounselling.in. Not affiliated with MCC, NBEMS, NMC or any state counselling authority.</span>
          <span>Past closing ranks are a guide, not a guarantee of a future allotment.</span>
        </div>
      </div>
    </footer>
  );
}
