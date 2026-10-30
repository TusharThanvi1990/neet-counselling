import { NextResponse, type NextRequest } from 'next/server';
import { choiceDetails, parseProfile } from '@/lib/query';

/** GET /api/choices?k=<choiceKey>&k=…&rank=&cat=&pwd=&rounds= → details for a saved choice list. */
export function GET(req: NextRequest) {
  const sp = Object.fromEntries([...new Set(req.nextUrl.searchParams.keys())].map((k) => [k, req.nextUrl.searchParams.getAll(k)]));
  const keys = (sp.k ?? []).slice(0, 300);
  return NextResponse.json({ choices: choiceDetails(keys, parseProfile(sp)) });
}
