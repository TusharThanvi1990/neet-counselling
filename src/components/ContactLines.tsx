import { BUSINESS as B } from '@/lib/business';

/** Name, address, phone and email as a block, reused by the contact page and every policy page. */
export default function ContactLines() {
  return (
    <address style={{ fontStyle: 'normal', lineHeight: 1.6 }}>
      <b>{B.name}</b><br />
      {B.address.map((l) => <span key={l}>{l}<br /></span>)}
      Phone / WhatsApp: <a href={B.phoneHref}>{B.phone}</a><br />
      {B.email && <>Email: <a href={`mailto:${B.email}`}>{B.email}</a><br /></>}
      Support hours: {B.hours}
    </address>
  );
}
