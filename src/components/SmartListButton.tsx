'use client';

import Link from 'next/link';
import { useState } from 'react';
import { readLists, writeLists } from './choices';

/**
 * "Build my choice list": saves the predictor's current matches as a new named list, ordered the way
 * choice filling works (hardest-to-get first, so Reach, then Possible, then Safer, each by closing rank).
 */
export default function SmartListButton({ keys, name }: { keys: string[]; name: string }) {
  const [done, setDone] = useState<number | null>(null);
  if (done != null) return <Link className="btn added" href="/my-list">✓ {done} saved · open list</Link>;
  return (
    <button type="button" className="btn primary" disabled={!keys.length} onClick={() => {
      const s = readLists();
      const id = `l${Date.now().toString(36)}`;
      writeLists({ active: id, lists: [...s.lists, { id, name, keys: [...new Set(keys)] }] });
      setDone(new Set(keys).size);
    }}>Build my choice list ({keys.length})</button>
  );
}
