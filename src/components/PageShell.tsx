import Link from 'next/link';
import type { ReactNode } from 'react';

/** Standard tool / data page: a header band with breadcrumb, title and intro, then the page body. */
export default function PageShell({ title, intro, crumb, children }: { title: ReactNode; intro?: ReactNode; crumb?: { href: string; label: string }; children: ReactNode }) {
  return (
    <>
      <section className="page-head">
        <div className="container">
          <div className="crumbs"><Link href="/">Home</Link>{crumb && <> / <Link href={crumb.href}>{crumb.label}</Link></>}</div>
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
      </section>
      <div className="container page-body">{children}</div>
    </>
  );
}
