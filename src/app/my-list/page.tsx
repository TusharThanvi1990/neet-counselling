import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';
import MyList from '@/components/MyList';

export const metadata: Metadata = { title: 'My choice list' };

export default function MyListPage() {
  return (
    <PageShell title="My choice list" intro={<>Order these by where you would actually rather study, not by your chances. MCC fills your list from the top, so a choice placed above another is always preferred. The list is saved in this browser.</>}>

      <MyList />
    </PageShell>
  );
}
