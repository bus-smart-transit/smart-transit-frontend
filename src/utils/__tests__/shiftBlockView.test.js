import { describe, expect, test } from 'vitest';
import {
  EMPTY_FILTERS, SECTIONS, VIEWS, applyFilters, filterOptions, groupBySection, isFiltering, showsAssignmentState,
} from '../shiftBlockView';

const person = (id, name, status = 'pending') => ({ staff_id: id, name, status, needs_replacement: false });

const card = (over = {}) => ({
  key: `block-${over.shift_block_id ?? 1}`, kind: 'block', shift_block_id: 1, route_name: 'Alpha-Omega', scheduled_date: '2026-10-05', start_time: '06:00',
  status: 'scheduled', section: 'today', answerable: true,
  assignments: { driver: person(6, 'Dina Driver'), conductor: person(7, 'Carl Chauffeur', 'accepted') },
  ...over,
});

const TODAY = '2026-10-05';

describe('groupBySection', () => {
  const cards = [
    card({ shift_block_id: 1, section: 'today', start_time: '10:00' }),
    card({ shift_block_id: 2, section: 'today', start_time: '06:00' }),
    card({ shift_block_id: 3, section: 'upcoming', scheduled_date: '2026-10-09' }),
    card({ shift_block_id: 4, section: 'upcoming', scheduled_date: '2026-10-07' }),
    card({ shift_block_id: 5, section: 'overdue', scheduled_date: '2026-10-01', status: 'delayed' }),
    card({ shift_block_id: 6, section: 'overdue', scheduled_date: '2026-10-03', status: 'boarding' }),
    card({ shift_block_id: 7, section: 'past', scheduled_date: '2026-10-02', status: 'completed' }),
  ];

  test('puts each card in the section the server named, by business day', () => {
    const g = groupBySection(cards, TODAY);
    expect(g.today.map((c) => c.shift_block_id)).toEqual([2, 1]);
    expect(g.upcoming.map((c) => c.shift_block_id)).toEqual([4, 3]);
    expect(g.overdue.map((c) => c.shift_block_id)).toEqual([6, 5]);
    expect(g.past.map((c) => c.shift_block_id)).toEqual([7]);
  });

  test('works out the section from the Manila date when an older response has none', () => {
    const bare = (over) => ({ ...card(over), section: undefined });
    const g = groupBySection([
      bare({ shift_block_id: 1, scheduled_date: TODAY }),
      bare({ shift_block_id: 2, scheduled_date: '2026-10-06' }),
      bare({ shift_block_id: 3, scheduled_date: '2026-10-03', status: 'scheduled' }),
      bare({ shift_block_id: 4, scheduled_date: '2026-10-03', status: 'completed' }),
    ], TODAY);
    expect([g.today.length, g.upcoming.length, g.overdue.length, g.past.length]).toEqual([1, 1, 1, 1]);
  });

  test('the default view is Today and Upcoming; Overdue and Past are chosen', () => {
    expect(VIEWS[0]).toMatchObject({ value: 'current', sections: ['today', 'upcoming'] });
    expect(SECTIONS.map((s) => s.title)).toEqual(['Today', 'Upcoming', 'Overdue', 'Past']);
  });
});

describe('showsAssignmentState (the screenshot case)', () => {
  test('is true only while the server says the block can still be answered', () => {
    expect(showsAssignmentState(card({ answerable: true }), TODAY)).toBe(true);
    // Oct 5 block, a leg completed and the rest cancelled, both staff still "pending": the server says not answerable.
    expect(showsAssignmentState(card({ status: 'completed', section: 'past', answerable: false }), TODAY)).toBe(false);
    expect(showsAssignmentState(card({ status: 'delayed', section: 'overdue', answerable: false }), TODAY)).toBe(false);
  });

  test('falls back to the same rule when the field is missing', () => {
    const bare = (over) => ({ ...card(over), answerable: undefined });
    expect(showsAssignmentState(bare({ status: 'scheduled', section: 'upcoming' }), TODAY)).toBe(true);
    expect(showsAssignmentState(bare({ status: 'completed', section: 'today' }), TODAY)).toBe(false);
    expect(showsAssignmentState(bare({ status: 'cancelled', section: 'past' }), TODAY)).toBe(false);
    expect(showsAssignmentState(bare({ status: 'scheduled', section: 'overdue' }), TODAY)).toBe(false);
    expect(showsAssignmentState(bare({ status: 'in-progress', section: 'today' }), TODAY)).toBe(false);
  });
});

describe('filters', () => {
  const cards = [
    card({ shift_block_id: 1, route_name: 'Alpha-Omega', status: 'scheduled', scheduled_date: '2026-10-05' }),
    card({ shift_block_id: 2, route_name: 'Beta-Gamma', status: 'boarding', scheduled_date: '2026-10-06', assignments: { driver: person(8, 'Ben Driver'), conductor: person(7, 'Carl Chauffeur') } }),
    card({ shift_block_id: 3, route_name: 'Alpha-Omega', status: 'completed', scheduled_date: '2026-10-02', section: 'past', assignments: { driver: person(6, 'Dina Driver'), conductor: { staff_id: null, name: null, needs_replacement: true } } }),
  ];
  const ids = (list) => list.map((c) => c.shift_block_id);

  test('no filter returns everything', () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false);
    expect(ids(applyFilters(cards, EMPTY_FILTERS))).toEqual([1, 2, 3]);
  });

  test('by status, using the derived groups', () => {
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, status: 'scheduled' }))).toEqual([1]);
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, status: 'in_progress' }))).toEqual([2]);
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, status: 'completed' }))).toEqual([3]);
  });

  test('by route', () => {
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, route: 'Alpha-Omega' }))).toEqual([1, 3]);
  });

  test('by driver or chauffeur (either role)', () => {
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, person: 'driver:6' }))).toEqual([1, 3]);
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, person: 'conductor:7' }))).toEqual([1, 2]);
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, person: 'driver:8' }))).toEqual([2]);
  });

  test('by date range, both ends included', () => {
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, from: '2026-10-05' }))).toEqual([1, 2]);
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, to: '2026-10-05' }))).toEqual([1, 3]);
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, from: '2026-10-05', to: '2026-10-05' }))).toEqual([1]);
  });

  test('filters combine', () => {
    expect(ids(applyFilters(cards, { ...EMPTY_FILTERS, route: 'Alpha-Omega', status: 'completed' }))).toEqual([3]);
    expect(isFiltering({ ...EMPTY_FILTERS, route: 'Alpha-Omega' })).toBe(true);
  });

  test('the choices come from the loaded cards (no fixed routes or names)', () => {
    const opts = filterOptions(cards);
    expect(opts.routes).toEqual(['Alpha-Omega', 'Beta-Gamma']);
    expect(opts.people.map((p) => p.label)).toEqual(['Ben Driver (Driver)', 'Carl Chauffeur (Chauffeur)', 'Dina Driver (Driver)']);
  });
});
