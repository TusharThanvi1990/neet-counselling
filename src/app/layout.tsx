import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'PG Seat Compass – NEET PG College Predictor & Cutoffs', template: '%s | PG Seat Compass' },
  description: 'Find the NEET PG seats your rank can get. College predictor, closing ranks, seat matrix, fees and stipends, built on MCC’s official allotment results.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
