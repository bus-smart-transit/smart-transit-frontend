import { describe, expect, it } from 'vitest';
import { groupNotifications, groupTitle } from '../notificationGroups';

const fields = { id: (n) => n.notification_id, text: (n) => n.body };
const n = (id, title, read = false, type = 'block_assigned') => ({ notification_id: id, title, type, body: `msg ${id}`, read_at: read ? '2026-10-27' : null });

describe('groupNotifications', () => {
  it('puts notifications of the same kind together, newest group first', () => {
    const groups = groupNotifications([
      n(5, 'New Shift Block Assignment'),
      n(4, 'Trip cancelled', false, 'trip_cancelled'),
      n(3, 'New Shift Block Assignment'),
      n(2, 'New Shift Block Assignment'),
    ], fields);

    expect(groups.map((g) => [g.title, g.count])).toEqual([['New Shift Block Assignment', 3], ['Trip cancelled', 1]]);
    expect(groups[0].ids).toEqual([5, 3, 2]);
  });

  it('keeps read and unread apart, so marking a group read moves it whole', () => {
    const groups = groupNotifications([n(3, 'New Shift Block Assignment'), n(2, 'New Shift Block Assignment', true)], fields);

    expect(groups.map((g) => [g.unread, g.count])).toEqual([[true, 1], [false, 1]]);
  });

  it('counts the group in its title only when there is more than one', () => {
    expect(groupTitle({ title: 'Trip cancelled', count: 1 })).toBe('Trip cancelled');
    expect(groupTitle({ title: 'New Shift Block Assignment', count: 3 })).toBe('New Shift Block Assignment (3)');
  });
});
