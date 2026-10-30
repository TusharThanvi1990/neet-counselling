'use client';

/**
 * A GET form whose fields live in the URL. Changing any field updates the URL (debounced), which
 * re-renders the server page — so every filtered view is a shareable link. Without JS it still
 * works through the submit button.
 */
import { useRouter, usePathname } from 'next/navigation';
import { useRef, useTransition, type ReactNode } from 'react';

export default function AutoForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (form: HTMLFormElement) => {
    const qs = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === 'string' && v !== '') qs.append(k, v);
    start(() => router.replace(`${pathname}?${qs}`, { scroll: false }));
  };

  return (
    <form
      method="get"
      className={className}
      aria-busy={pending}
      onChange={(e) => {
        const form = e.currentTarget;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => push(form), 250);
      }}
      onSubmit={(e) => { e.preventDefault(); push(e.currentTarget); }}
    >
      {children}
      <noscript><button className="btn primary" type="submit">Apply</button></noscript>
      <span className="pending" aria-live="polite">{pending ? 'Updating…' : ''}</span>
    </form>
  );
}
