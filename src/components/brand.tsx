import Link from 'next/link';

/** Site navigation and the logo, shared by the (client) header and the (server) footer. */
export const NAV = [
  { href: '/predictor', label: 'College Predictor' },
  { href: '/cutoffs', label: 'Cutoffs' },
  { href: '/allotments', label: 'Allotments' },
  { href: '/seat-matrix', label: 'Seat Matrix' },
  { href: '/institutes', label: 'Colleges & Fees' },
];

export const TOOLS = [
  { href: '/rank-scan', label: 'Rank Scan', text: 'What ranks near yours got in every round' },
  { href: '/score-to-rank', label: 'Score to rank', text: 'Your NEET PG score as an All India Rank' },
  { href: '/compare', label: 'Compare colleges', text: 'Cutoffs, seats, fees and bond side by side' },
  { href: '/eligibility', label: 'Quota eligibility', text: 'Which counsellings and quotas you can apply for' },
  { href: '/seat-matrix?view=changes', label: 'Seat increase', text: 'Seats added or cut this year' },
  { href: '/calendar', label: 'Counselling calendar', text: 'Round dates for MCC 2026' },
  { href: '/notices', label: 'Official notices', text: 'MCC and state notices, updated hourly' },
  { href: '/sources', label: 'Data sources', text: 'Every official PDF we use' },
];

/** Compass mark: a needle on an ink tile. */
export function Mark({ size = 34, tile = '#0F1B1A', ring = '#2E3E3C' }: { size?: number; tile?: string; ring?: string }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill={tile} />
      <circle cx="20" cy="20" r="13" fill="none" stroke={ring} strokeWidth="1.4" />
      <g transform="rotate(35 20 20)">
        <path d="M20 6.5 L23.6 20 L20 20 Z" fill="#F0B429" /><path d="M20 6.5 L16.4 20 L20 20 Z" fill="#C98F12" />
        <path d="M20 33.5 L16.4 20 L20 20 Z" fill="#FFFFFF" /><path d="M20 33.5 L23.6 20 L20 20 Z" fill="#BFCBC8" />
      </g>
      <circle cx="20" cy="20" r="1.8" fill={tile} />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="logo" aria-label="NEET PG Counselling home">
      {dark ? <Mark tile="#0A5C55" ring="#2D7A72" /> : <Mark />}
      <span>NEET PG <b>Counselling</b>{dark && <span className="tld">.in</span>}</span>
    </Link>
  );
}
