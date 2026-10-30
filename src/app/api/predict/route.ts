import { NextResponse, type NextRequest } from 'next/server';
import { parseProfile, predict, type Band, type SortKey } from '@/lib/query';

/**
 * GET /api/predict — the predictor as JSON, for a future mobile app or partner integration.
 * Same parameters as the home page: rank, cat, pwd=1, year, rounds (r1|main|all), branch, program, state,
 * quota (repeatable), band (safe|possible|reach), sort (close|margin|inst), q, limit (≤2000).
 */
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const sp = Object.fromEntries([...new Set(params.keys())].map((k) => [k, params.getAll(k)]));
  const profile = parseProfile(sp);
  const result = predict(profile, {
    band: (params.get('band') as Band) ?? 'all',
    sort: (params.get('sort') as SortKey) ?? 'close',
    q: params.get('q') ?? '',
    limit: Math.min(2000, Number(params.get('limit')) || 100),
  });
  return NextResponse.json({ profile, ...result });
}
