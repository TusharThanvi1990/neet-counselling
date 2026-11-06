import type { Metadata } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono, Inter } from 'next/font/google';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.neetpgcounselling.in'),
  title: { default: 'NEET PG Counselling – College Predictor, Cutoffs, Fees & Seat Matrix', template: '%s | NEET PG Counselling' },
  description: 'Find the NEET PG seats your rank can get. College predictor, closing ranks, allotments, seat matrix, fees, stipend and bond for MCC and state counselling, built on the official result PDFs.',
  applicationName: 'NEET PG Counselling',
  openGraph: { siteName: 'NEET PG Counselling', type: 'website', locale: 'en_IN' },
};

export const viewport = { themeColor: '#0f1b1a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
