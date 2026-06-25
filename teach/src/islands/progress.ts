// Course progress — a single persistent set of completed ids, mirrored to
// localStorage. A lesson/check marks its id complete when its game or quiz is
// finished; the hub reads this to compute module status and unlock the next
// module. This is the headline feature the Astro rewrite enables.
//
// Ids: lesson ids ("0001", "0002", …) and module-check ids ("check-overview",
// "check-reading"). The module-check ids are the unlock gates between modules.
import { persistentAtom } from '@nanostores/persistent';

export const completed = persistentAtom<string[]>('bc.completed', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

/** Add an id to the completed set (idempotent). No-op if id is falsy. */
export function markComplete(id?: string) {
  if (!id) return;
  const cur = completed.get();
  if (!cur.includes(id)) completed.set([...cur, id]);
}

export function isComplete(id: string, list = completed.get()): boolean {
  return list.includes(id);
}
