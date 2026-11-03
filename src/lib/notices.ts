/**
 * Official notices feed: reads each counselling body's own page (server side, cached for an hour by Next's fetch cache)
 * and keeps the links whose text is about PG medical counselling. Nothing is stored; a site that is down is reported as
 * unreachable and the rest still show.
 */
/** all: every PDF link counts (the page is PG-only); rowTitle: the title is the table row's text and the link just says "View". */
export type NoticeSource = { body: string; url: string; all?: boolean; rowTitle?: boolean };
export type Notice = { title: string; href: string };
export type SourceNotices = NoticeSource & { ok: boolean; notices: Notice[] };

/** Sites whose PG notices are plain links on one page. */
export const FEED_SOURCES: NoticeSource[] = [
  { body: 'MCC (All India)', url: 'https://mcc.nic.in/pg-medical-counselling/' },
  { body: 'West Bengal (WBMCC)', url: 'https://wbmcc.nic.in/pg-medical-counselling/' },
  { body: 'Assam (DME)', url: 'https://dme.assam.gov.in/node/95928' },
  { body: 'Jharkhand (JCECEB)', url: 'https://jceceb.jharkhand.gov.in/' },
  { body: 'Uttarakhand (HNBUMU)', url: 'https://meta-secure.com/HNBUMU_MDMS' },
  { body: 'Tamil Nadu (Selection Committee)', url: 'https://tnmedicalselection.net/' },
  { body: 'Puducherry (CENTAC)', url: 'https://www.centacpuducherry.in/' },
  { body: 'Bihar (BCECEB)', url: 'https://bceceboard.bihar.gov.in/' },
  { body: 'Jammu & Kashmir (JKBOPEE)', url: 'https://www.jkbopee.gov.in/' },
  { body: 'Goa (DTE)', url: 'https://dte.goa.gov.in/' },
  { body: 'Chhattisgarh (DME)', url: 'https://cgdme.admissions.nic.in/' },
  { body: 'Maharashtra (State CET Cell)', url: 'https://medical2026.mahacet.org/NEET-PGM-2026/login' },
  { body: 'Madhya Pradesh (DME)', url: 'https://dme.mponline.gov.in/portal/services/dmemp/DMEPG/Profile/ProfileLoginHome.aspx?Counstype=rfZR9zLVYzySY17sU9L9gA%3d%3d' },
  { body: 'Punjab (BFUHS)', url: 'https://admission.bfuhsonline.ac.in/mdms/mdms.asp' },
  { body: 'Andhra Pradesh (Dr NTR UHS)', url: 'https://drntr.uhsap.in/index/' },
  { body: 'Himachal Pradesh (AMRU)', url: 'https://amruhp.ac.in/' },
  { body: 'Kerala (CEE)', url: 'https://cee.kerala.gov.in/pgm2026/', all: true },
  { body: 'Telangana (KNRUHS)', url: 'https://www.knruhs.telangana.gov.in/admission-notification/', rowTitle: true },
];

/** Sites whose notices load by script or sit behind several pages: linked, not read. */
export const LINK_ONLY: NoticeSource[] = [
  { body: 'Uttar Pradesh (DGME)', url: 'https://upneet.gov.in/' },
  { body: 'Karnataka (KEA)', url: 'https://cetonline.karnataka.gov.in/kea/' },
  { body: 'Gujarat (ACPPGMEC)', url: 'https://www.medadmgujarat.org/pgmed/' },
  { body: 'Rajasthan (NEET PG Board)', url: 'https://rajpgneet2026.in/' },
  { body: 'Odisha (DMET)', url: 'https://dmetodisha.in/' },
  { body: 'Haryana (DMER)', url: 'https://hry.online-counselling.co.in/' },
  { body: 'NBEMS (NEET PG exam)', url: 'https://natboard.edu.in/' },
];

const PG = /\b(PG|P\.G\.?|NEET[- ]?PG|M\.?D\.?\s*\/\s*M\.?S\.?|MD\s*\/\s*MS|post ?graduate|MDMS)\b/i;
const NOT_PG = /dental|\bMDS\b|B\.?\s?Sc|nursing|\bUG\b|MBBS|AYUSH|paramedical|pharm/i;
const NAV = /^(post graduate - medical( courses)?|pg medical|ug medical|md\/ms\/dnb course|post graduate board of studies)$/i;
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, '&').replace(/&#39;|&#039;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export function extractNotices(html: string, base: string, max = 8, opts: { all?: boolean; rowTitle?: boolean } = {}): Notice[] {
  const out: Notice[] = [], seen = new Set<string>();
  // [href, title] pairs: each link with its own text, or (rowTitle) each table row's first link with the row's text
  const pairs: [string, string][] = opts.rowTitle
    ? [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((r) => {
      const h = r[1].match(/href=["']([^"'#][^"']*)["']/i);
      return h ? [[h[1], r[1].replace(/View Document|Download/gi, '')] as [string, string]] : [];
    })
    : [...html.matchAll(/<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => [m[1], m[2]] as [string, string]);
  for (const [rawHref, rawTitle] of pairs) {
    const title = decode(rawTitle.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/^\d{2}-\d{2}-\d{4}\s*/, '').trim();
    if (title.length < 12 || title.length > 300 || NAV.test(title) || /^javascript:/i.test(rawHref)) continue;
    if (opts.all ? !/\.pdf/i.test(rawHref) : !PG.test(title) || NOT_PG.test(title)) continue;
    let href: string;
    try { href = new URL(decode(rawHref), base).href; } catch { continue; }
    if (seen.has(title)) continue;
    seen.add(title);
    out.push({ title: title.replace(/\s*new$/i, ''), href });
    if (out.length >= max) break;
  }
  return out;
}

export async function fetchNotices(): Promise<SourceNotices[]> {
  return Promise.all(FEED_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PGSeatCompass/1.0; notices feed)' },
        next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { ...src, ok: false, notices: [] };
      return { ...src, ok: true, notices: extractNotices(await res.text(), src.url, 8, src) };
    } catch {
      return { ...src, ok: false, notices: [] };
    }
  }));
}
