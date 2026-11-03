import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import { fetchNotices, LINK_ONLY } from '@/lib/notices';

export const metadata: Metadata = { title: 'Official counselling notices' };
export const revalidate = 3600;

export default async function NoticesPage() {
  const sources = await fetchNotices();
  const checked = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <PageShell
      title="Official Counselling Notices"
      intro={<>The latest PG medical notices from MCC and the state counselling sites, read straight from their own pages every hour. Always open the official notice before acting on it. Last checked {checked} IST.</>}
    >
      <div className="notice-grid">
        {sources.map((s) => (
          <section key={s.url} className="card">
            <h3><a href={s.url} target="_blank" rel="noopener">{s.body}</a></h3>
            {!s.ok && <p className="sub">Could not reach the site just now. <a href={s.url} target="_blank" rel="noopener">Open it directly</a>.</p>}
            {s.ok && !s.notices.length && <p className="sub">No PG medical notices on the front page right now.</p>}
            <ul className="notice-list">
              {s.notices.map((n) => <li key={n.href + n.title}><a href={n.href} target="_blank" rel="noopener">{n.title}</a></li>)}
            </ul>
          </section>
        ))}
      </div>
      <h2>Other official sites</h2>
      <p className="sub">These sites load their notices in a way we cannot read automatically, so check them directly.</p>
      <ul className="link-list">
        {LINK_ONLY.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener">{s.body}</a></li>)}
      </ul>
    </PageShell>
  );
}
