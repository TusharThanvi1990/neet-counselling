import type { Metadata } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import NavTabs from '@/components/NavTabs';
import { getData } from '@/lib/data';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const body = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: { default: 'PG Seat Compass', template: '%s · PG Seat Compass' },
  description: 'NEET PG counselling: see where ranks like yours were allotted, using MCC’s official results from 2023 onwards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const d = getData();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <header className="top">
          <div className="wrap">
            <div className="brandrow">
              <Link href="/" className="brand">PG Seat <span>Compass</span></Link>
              <div className="dataline">
                MCC NEET PG {Math.min(...d.years)}–{Math.max(...d.years)} · <b className="num">{d.n.toLocaleString('en-IN')}</b> allotments ·{' '}
                <b className="num">{d.rounds.length}</b> official result PDFs
              </div>
            </div>
            <NavTabs />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="wrap">
          Built from MCC’s published result PDFs. Past results are not a guarantee; MCC is the source of truth for all counselling decisions.
        </footer>
      </body>
    </html>
  );
}
