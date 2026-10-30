'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CHOICES_EVENT, readChoices } from './choices';
import { CloseIcon, CompassIcon, ListIcon, MenuIcon } from './Icons';

export const NAV = [
  { href: '/predictor', label: 'College Predictor' },
  { href: '/cutoffs', label: 'Cutoffs' },
  { href: '/allotments', label: 'Allotments' },
  { href: '/seat-matrix', label: 'Seat Matrix' },
  { href: '/institutes', label: 'Colleges & Fees' },
  { href: '/rank-scan', label: 'Rank Scan' },
];

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="PG Seat Compass home">
      <span className="mark"><CompassIcon size={20} /></span>
      <span>PG Seat <b>Compass</b></span>
    </Link>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(readChoices().length);
    sync();
    window.addEventListener(CHOICES_EVENT, sync);
    return () => window.removeEventListener(CHOICES_EVENT, sync);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  const current = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined);

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-bar">
          <Logo />
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
          </nav>
          <div className="header-actions">
            <Link href="/my-list" className="btn" aria-current={current('/my-list')}>
              <ListIcon size={18} /><span className="btn-list-label">My list</span><span className="count">{count}</span>
            </Link>
            <button type="button" className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
            <Link href="/sources" aria-current={current('/sources')}>Data sources</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
