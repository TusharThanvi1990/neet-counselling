import Link from 'next/link';
import { Logo } from './SiteHeader';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <Logo />
            <p style={{ margin: 0, maxWidth: 320 }}>
              NEET PG counselling made simple: real MCC allotment data, college fees and seat matrices in one place.
            </p>
          </div>
          <div>
            <h4>Tools</h4>
            <ul>
              <li><Link href="/predictor">College Predictor</Link></li>
              <li><Link href="/rank-scan">Rank Scan</Link></li>
              <li><Link href="/my-list">Choice list</Link></li>
            </ul>
          </div>
          <div>
            <h4>Data</h4>
            <ul>
              <li><Link href="/cutoffs">Branch cutoffs</Link></li>
              <li><Link href="/allotments">Allotment lists</Link></li>
              <li><Link href="/seat-matrix">Seat matrix</Link></li>
              <li><Link href="/institutes">Colleges & fees</Link></li>
            </ul>
          </div>
          <div>
            <h4>About</h4>
            <ul>
              <li><Link href="/sources">Data sources & method</Link></li>
              <li><a href="https://mcc.nic.in/pg-medical-counselling/" target="_blank" rel="noopener">MCC official website</a></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© {new Date().getFullYear()} PG Seat Compass. Not affiliated with MCC, NBEMS or NMC.</span>
          <span>Based on MCC’s published results. Past results are not a guarantee of future allotment.</span>
        </div>
      </div>
    </footer>
  );
}
