'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CHOICES_EVENT, readChoices } from './choices';

const TABS = [
  { href: '/', label: 'Predictor' },
  { href: '/allotments', label: 'Allotments' },
  { href: '/cutoffs', label: 'Branch cutoffs' },
  { href: '/seat-matrix', label: 'Seat matrix' },
  { href: '/institutes', label: 'Institutes & fees' },
  { href: '/rank-scan', label: 'Rank Scan' },
  { href: '/my-list', label: 'My choice list' },
  { href: '/sources', label: 'Sources & method' },
];

export default function NavTabs() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(readChoices().length);
    sync();
    window.addEventListener(CHOICES_EVENT, sync);
    return () => window.removeEventListener(CHOICES_EVENT, sync);
  }, []);

  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={pathname === t.href || (t.href !== '/' && pathname.startsWith(t.href + '/')) ? 'page' : undefined}>
          {t.label}
          {t.href === '/my-list' && <span className="count">{count}</span>}
        </Link>
      ))}
    </nav>
  );
}
