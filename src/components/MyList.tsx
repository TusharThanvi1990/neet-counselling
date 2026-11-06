'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CHOICES_EVENT, createList, deleteList, readLists, renameList, setActiveList, writeChoices, type ListsState } from './choices';

type Detail =
  | { key: string; missing: true }
  | { key: string; missing: false; year: number; institute: string; state: string; branch: string; quota: string; closingRank: number | null; band: 'safe' | 'possible' | 'reach' | null };

const BAND = { safe: 'Safer', possible: 'Possible', reach: 'Reach' } as const;
const PROFILE_KEY = 'pgsc.listProfile';
type Prof = { rank: string; cat: string; pwd: boolean; rounds: string };
const DEFAULT: Prof = { rank: '9500', cat: 'General', pwd: false, rounds: 'main' };

export default function MyList() {
  const [lists, setLists] = useState<ListsState | null>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [delArmed, setDelArmed] = useState(false);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [prof, setProf] = useState<Prof>(DEFAULT);
  const [msg, setMsg] = useState('');
  const [text, setText] = useState('');
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    try { setProf({ ...DEFAULT, ...JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') }); } catch { /* defaults */ }
    const sync = () => setLists(readLists());
    sync();
    window.addEventListener(CHOICES_EVENT, sync);
    return () => window.removeEventListener(CHOICES_EVENT, sync);
  }, []);

  const active = lists?.lists.find((l) => l.id === lists.active);
  const keys = useMemo(() => active?.keys ?? [], [active]);

  const load = useCallback(async () => {
    if (!keys.length) { setDetails({}); return; }
    const qs = new URLSearchParams({ rank: prof.rank, cat: prof.cat, rounds: prof.rounds, ...(prof.pwd ? { pwd: '1' } : {}) });
    keys.forEach((k) => qs.append('k', k));
    const res = await fetch(`/api/choices?${qs}`);
    const json: { choices: Detail[] } = await res.json();
    setDetails(Object.fromEntries(json.choices.map((c) => [c.key, c])));
  }, [keys, prof]);
  useEffect(() => { load(); }, [load]);

  const updateProf = (p: Partial<Prof>) => {
    const next = { ...prof, ...p };
    setProf(next);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* not saved */ }
  };
  const move = (i: number, dir: -1 | 1) => { const l = [...keys]; [l[i], l[i + dir]] = [l[i + dir], l[i]]; writeChoices(l); };
  const remove = (i: number) => writeChoices(keys.filter((_, j) => j !== i));

  const asText = () => keys.map((k, i) => {
    const d = details[k];
    return d && !d.missing ? `${i + 1}. ${d.institute} (${d.state}) | ${d.branch} | ${d.quota} | ${d.year} closing ${d.closingRank ?? '-'}` : `${i + 1}. (unavailable)`;
  }).join('\n');

  return (
    <>
      <div className="panel no-print">
        <div className="fields">
          <label className="field"><span>List</span>
            <select value={lists?.active ?? ''} onChange={(e) => { setActiveList(e.target.value); setMsg(''); setDelArmed(false); }}>
              {lists?.lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.keys.length})</option>)}
            </select></label>
          {renaming === active?.id ? (
            <label className="field"><span>New name</span>
              <input type="search" autoFocus defaultValue={active?.name} onKeyDown={(e) => {
                if (e.key === 'Enter') { renameList(active!.id, e.currentTarget.value); setRenaming(null); }
                if (e.key === 'Escape') setRenaming(null);
              }} onBlur={(e) => { renameList(active!.id, e.currentTarget.value); setRenaming(null); }} /></label>
          ) : (
            <button className="btn" type="button" onClick={() => setRenaming(active?.id ?? null)}>Rename</button>
          )}
          <button className="btn" type="button" disabled={(lists?.lists.length ?? 0) < 2} onClick={() => {
            if (!delArmed) { setDelArmed(true); return; }
            deleteList(active!.id); setDelArmed(false); setMsg('List deleted.');
          }}>{delArmed ? 'Click again to delete' : 'Delete list'}</button>
          <label className="field"><span>New list</span>
            <input type="search" value={newName} placeholder="e.g. Clinical, DNB" onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { createList(newName); setNewName(''); } }} /></label>
          <button className="btn" type="button" onClick={() => { createList(newName); setNewName(''); }}>Create list</button>
        </div>
        <p className="note" style={{ margin: 0 }}>“+ Add” buttons add to the list selected here.</p>
        <hr className="divider" />
        <div className="fields">
          <label className="field"><span>Your rank</span>
            <input className="rank" type="number" min={1} value={prof.rank} onChange={(e) => updateProf({ rank: e.target.value })} /></label>
          <label className="field"><span>Category</span>
            <select value={prof.cat} onChange={(e) => updateProf({ cat: e.target.value })}>
              {['General', 'EWS', 'OBC', 'SC', 'ST'].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="check"><input type="checkbox" checked={prof.pwd} onChange={(e) => updateProf({ pwd: e.target.checked })} /> PwD</label>
          <label className="field"><span>Rounds</span>
            <select value={prof.rounds} onChange={(e) => updateProf({ rounds: e.target.value })}>
              <option value="main">Rounds 1–3</option><option value="r1">Round 1 only</option><option value="all">All rounds incl. stray</option></select></label>
        </div>
      </div>

      <div className="print-only">
        <h2 style={{ marginTop: 0 }}>{active?.name} · NEET PG choice list</h2>
        <p>AIR {prof.rank} · {prof.cat}{prof.pwd ? ' · PwD' : ''} · {keys.length} choices · neetpgcounselling.in</p>
      </div>
      <div className="tablebox">
        <table>
          <thead><tr><th className="num">#</th><th>Institute</th><th>Branch</th><th className="hide-sm">Quota</th><th className="num">Closing rank</th><th>Chance</th><th /></tr></thead>
          <tbody>
            {keys.length ? keys.map((k, i) => {
              const d = details[k];
              return (
                <tr key={k}>
                  <td className="num">{i + 1}</td>
                  {!d ? <td colSpan={5} className="sub">Loading…</td>
                    : d.missing ? <td colSpan={5} className="sub">This option is no longer in the dataset.</td>
                    : <>
                      <td><div className="inst">{d.institute}</div><div className="sub">{d.state}</div></td>
                      <td>{d.branch}</td>
                      <td className="hide-sm"><span className="tag">{d.quota}</span></td>
                      <td className="num">{d.closingRank == null ? '—' : d.closingRank.toLocaleString('en-IN')}<div className="sub">{d.year}</div></td>
                      <td>{d.band ? <span className={`pill b-${d.band}`}>{BAND[d.band]}</span> : <span className="sub">Unlikely</span>}</td>
                    </>}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn" type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>{' '}
                    <button className="btn" type="button" disabled={i === keys.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>{' '}
                    <button className="btn" type="button" onClick={() => remove(i)}>Remove</button>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={7} className="empty">Your list is empty. Add options from the <Link href="/predictor">College Predictor</Link> with “+ Add”.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="toolbar">
        <button className="btn" type="button" disabled={keys.length < 2} title="Hardest-to-get first, the order choice filling expects" onClick={() => {
          const close = (k: string) => { const d = details[k]; return d && !d.missing && d.closingRank != null ? d.closingRank : Infinity; };
          writeChoices([...keys].sort((a, b) => close(a) - close(b)));
          setMsg('Ordered by closing rank: hardest to get first.');
        }}>Order by closing rank</button>
        <button className="btn" type="button" disabled={!keys.length} onClick={() => window.print()}>Print / save as PDF</button>
        <button className="btn primary" type="button" disabled={!keys.length} onClick={() => {
          const t = asText();
          navigator.clipboard.writeText(t).then(() => { setMsg(`Copied ${keys.length} choices.`); setText(''); },
            () => { setText(t); setMsg('Copy the text below.'); });
        }}>Copy list as text</button>
        <button className="btn" type="button" disabled={!keys.length} onClick={() => {
          if (!armed) { setArmed(true); return; }
          writeChoices([]); setArmed(false); setMsg('List cleared.');
        }}>{armed ? 'Click again to clear' : 'Clear list'}</button>
        <span className="note" role="status">{msg}</span>
      </div>
      {text && <textarea readOnly value={text} aria-label="Choice list text" onFocus={(e) => e.currentTarget.select()} />}
    </>
  );
}
