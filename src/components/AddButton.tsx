'use client';

import { useEffect, useState } from 'react';
import { CHOICES_EVENT, readChoices, writeChoices } from './choices';

export default function AddButton({ choice }: { choice: string }) {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const sync = () => setAdded(readChoices().includes(choice));
    sync();
    window.addEventListener(CHOICES_EVENT, sync);
    return () => window.removeEventListener(CHOICES_EVENT, sync);
  }, [choice]);

  return (
    <button
      type="button"
      className={`btn ${added ? 'added' : ''}`}
      onClick={() => {
        const list = readChoices();
        writeChoices(added ? list.filter((k) => k !== choice) : [...list, choice]);
      }}
    >
      {added ? '✓ Added' : '+ Add'}
    </button>
  );
}
