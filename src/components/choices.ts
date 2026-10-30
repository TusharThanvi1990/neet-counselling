'use client';

/**
 * The viewer's choice lists, kept in their browser. A viewer can keep several named lists (say, one for
 * clinical branches, one for DNB); "+ Add" buttons always add to the active list.
 * Keys come from `choiceKey` in lib/query.
 */
const KEY = 'pgsc.lists';
const LEGACY_KEY = 'pgsc.choices';
export const CHOICES_EVENT = 'pgsc:choices';

export type ChoiceList = { id: string; name: string; keys: string[] };
export type ListsState = { active: string; lists: ChoiceList[] };

const fresh = (keys: string[] = []): ListsState => ({ active: 'l1', lists: [{ id: 'l1', name: 'My list', keys }] });

export function readLists(): ListsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s: ListsState = JSON.parse(raw);
      if (s.lists?.length) return s.lists.some((l) => l.id === s.active) ? s : { ...s, active: s.lists[0].id };
    }
    return fresh(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]')); // single-list data from before named lists
  } catch {
    return fresh();
  }
}

export function writeLists(s: ListsState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: lists live for this page only */ }
  window.dispatchEvent(new Event(CHOICES_EVENT));
}

const activeOf = (s: ListsState) => s.lists.find((l) => l.id === s.active) ?? s.lists[0];

/** Keys in the active list. */
export const readChoices = () => activeOf(readLists()).keys;

/** Replace the active list's keys. */
export function writeChoices(keys: string[]) {
  const s = readLists();
  writeLists({ ...s, lists: s.lists.map((l) => (l.id === activeOf(s).id ? { ...l, keys } : l)) });
}

export function createList(name: string) {
  const s = readLists();
  const id = `l${Date.now().toString(36)}`;
  writeLists({ active: id, lists: [...s.lists, { id, name: name.trim() || `List ${s.lists.length + 1}`, keys: [] }] });
}

export function renameList(id: string, name: string) {
  const s = readLists();
  writeLists({ ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, name: name.trim() || l.name } : l)) });
}

export function deleteList(id: string) {
  const s = readLists();
  const lists = s.lists.filter((l) => l.id !== id);
  writeLists(lists.length ? { active: s.active === id ? lists[0].id : s.active, lists } : fresh());
}

export const setActiveList = (id: string) => writeLists({ ...readLists(), active: id });
