// How the Operator's Shift Blocks view groups, filters and reads its cards (Batch 30).
//
// Every card comes from the server (ShiftBlockAssignmentService): its status is derived from the legs, its section from
// the Manila business day, and `answerable` says whether the staff assignment can still be answered (date today or
// later, no leg started). This file only groups and filters; it never works a status out for itself. The fallbacks are
// for a response that predates a field, the same pattern as utils/assignmentCards.js.

import { cardSection, matchesStatusFilter } from './assignmentCards';

export const SECTIONS = [
  { key: 'today', title: 'Today', empty: 'Nothing is scheduled for today.' },
  { key: 'upcoming', title: 'Upcoming', empty: 'No upcoming blocks.' },
  { key: 'overdue', title: 'Overdue', empty: 'No overdue blocks.' },
  { key: 'past', title: 'Past', empty: 'No past blocks in this list.' },
];

/** The "Show" control: Today and Upcoming is the default view. */
export const VIEWS = [
  { value: 'current', label: 'Today and upcoming', sections: ['today', 'upcoming'] },
  { value: 'overdue', label: 'Overdue', sections: ['overdue'] },
  { value: 'past', label: 'Past', sections: ['past'] },
  { value: 'all', label: 'All', sections: ['today', 'upcoming', 'overdue', 'past'] },
];

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const EMPTY_FILTERS = { status: 'all', route: '', person: '', from: '', to: '' };

export const isFiltering = (filters) => Object.keys(EMPTY_FILTERS).some((key) => (filters?.[key] ?? EMPTY_FILTERS[key]) !== EMPTY_FILTERS[key]);

const norm = (value) => String(value || '').toLowerCase();
const OPEN = ['scheduled', 'delayed', 'boarding'];

/** The people on a card, for the person filter: [{ value: 'driver:6', role, id, name }]. */
export function cardPeople(card) {
  return ['driver', 'conductor']
    .map((role) => ({ role, id: card?.assignments?.[role]?.staff_id, name: card?.assignments?.[role]?.name }))
    .filter((p) => p.id && p.name)
    .map((p) => ({ ...p, value: `${p.role}:${p.id}` }));
}

export const roleLabel = (role) => (role === 'driver' ? 'Driver' : 'Chauffeur');

/** The choices for the Route and Driver or Chauffeur filters, taken from the cards themselves. */
export function filterOptions(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const routes = [...new Set(list.map((c) => c?.route_name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const seen = new Map();
  list.forEach((c) => cardPeople(c).forEach((p) => { if (!seen.has(p.value)) seen.set(p.value, { value: p.value, label: `${p.name} (${roleLabel(p.role)})` }); }));
  const people = [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  return { routes, people };
}

export function applyFilters(cards, filters = EMPTY_FILTERS) {
  const f = { ...EMPTY_FILTERS, ...filters };
  return (Array.isArray(cards) ? cards : []).filter((card) => {
    if (!matchesStatusFilter(card?.status, f.status)) return false;
    if (f.route && card?.route_name !== f.route) return false;
    if (f.person && !cardPeople(card).some((p) => p.value === f.person)) return false;
    const date = String(card?.scheduled_date || '');
    if (f.from && (!date || date < f.from)) return false;
    if (f.to && (!date || date > f.to)) return false;
    return true;
  });
}

const byStart = (a, b) => String(a.scheduled_date || '').localeCompare(String(b.scheduled_date || '')) || String(a.start_time || '').localeCompare(String(b.start_time || ''));

/** Today and Upcoming run soonest first; Overdue and Past run most recent first. */
export function groupBySection(cards, today) {
  const groups = { today: [], upcoming: [], overdue: [], past: [] };
  (Array.isArray(cards) ? cards : []).forEach((card) => {
    const key = cardSection(card, today);
    (groups[key] || groups.today).push(card);
  });
  groups.today.sort(byStart);
  groups.upcoming.sort(byStart);
  groups.overdue.sort((a, b) => byStart(b, a));
  groups.past.sort((a, b) => byStart(b, a));
  return groups;
}

/**
 * Whether the card shows each person's assignment state ("Awaiting response", "Accepted", "For approval"): only while
 * the block can still be answered. The server says so (`answerable`); an older response falls back to the same rule.
 */
export function showsAssignmentState(card, today) {
  if (typeof card?.answerable === 'boolean') return card.answerable;
  return ['today', 'upcoming'].includes(cardSection(card, today)) && OPEN.includes(norm(card?.status));
}
