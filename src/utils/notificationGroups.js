/**
 * 2026-10-27: the bell shows notifications of the same kind as one group ("3 new shift block assignments") instead of
 * one line each. Only how they are shown changes: every notification is still stored and can be opened on its own.
 *
 * Same kind = same type and title, and both unread or both read (so marking a group read moves it as a whole). Groups
 * keep the order of their newest notification (the server sends newest first).
 */

/**
 * @param {Array<object>} list notifications as the server sent them, newest first
 * @param {{ id: (n: object) => number, text: (n: object) => string }} fields how to read the id and the message
 * @returns {Array<{ key: string, title: string, unread: boolean, count: number, ids: number[], items: object[] }>}
 */
export function groupNotifications(list, fields) {
  const groups = [];
  const byKey = new Map();
  (Array.isArray(list) ? list : []).forEach((n) => {
    const unread = !n.read_at;
    const key = `${unread ? 'unread' : 'read'}|${n.type ?? n.data?.type ?? ''}|${n.title ?? ''}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, title: n.title ?? 'Notification', unread, count: 0, ids: [], items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.count += 1;
    group.ids.push(fields.id(n));
    group.items.push(n);
  });
  return groups;
}

/** "New Shift Block Assignment" for one, "New Shift Block Assignment (3)" for a group. */
export function groupTitle(group) {
  return group.count > 1 ? `${group.title} (${group.count})` : group.title;
}
