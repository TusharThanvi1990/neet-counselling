'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CHOICES_EVENT, readChoices } from './choices';
import { CloseIcon, ListIcon, MenuIcon } from './Icons';
import { Logo, NAV, TOOLS } from './brand';

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [count, setCount] = useState(0);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => setCount(readChoices().length);
    sync();
    window.addEventListener(CHOICES_EVENT, sync);
    return () => window.removeEventListener(CHOICES_EVENT, sync);
  }, []);
  useEffect(() => { setOpen(false); setMore(false); }, [pathname]);
  useEffect(() => {
    if (!more) return;
    const onClick = (e: MouseEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMore(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [more]);
  const current = (href: string) => (pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined);

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-bar">
          <Logo />
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
            <div className="nav-more" ref={moreRef} data-open={more ? '1' : undefined}>
              <button type="button" aria-expanded={more} aria-haspopup="true" onClick={() => setMore(!more)}>More tools ▾</button>
              {more && (
                <div className="nav-menu">
                  {TOOLS.map((t) => <Link key={t.href} href={t.href}>{t.label}<span>{t.text}</span></Link>)}
                </div>
              )}
            </div>
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
            <span className="group">More tools</span>
            {TOOLS.map((t) => <Link key={t.href} href={t.href} aria-current={current(t.href)}>{t.label}</Link>)}
          </nav>
        )}
      </div>
    </header>
  );
}
