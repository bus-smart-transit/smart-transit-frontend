// How the Driver / Chauffeur dashboards group their assignment cards (Batch 28 item 1, Batch 29 issue 1).
//
// The server decides each card's status and section from the leg statuses and the Manila day
// (ScheduleStatus). This file only reads those fields; the fallback below is for a response that
// predates them.

const norm = (value) => String(value || '').toLowerCase();
const isDone = (card) => ['completed', 'cancelled'].includes(norm(card?.status));

/** 'overdue' | 'today' | 'upcoming' | 'past' for one card. */
export function cardSection(card, today) {
  if (card?.section) return card.section;
  const date = String(card?.scheduled_date || '');
  if (!date || !today || date === today) return 'today';
  if (date > today) return 'upcoming';
  return isDone(card) ? 'past' : 'overdue';
}

/**
 * Overdue holds anything unfinished from an earlier day (never Today, never "scheduled"); Today and
 * Upcoming hold only open cards; "completed" lists the finished ones (today and earlier days).
 *
 * @param {Array} cards the server's assignment cards
 * @param {'all'|'scheduled'|'completed'} filter the dashboard's filter control
 * @param {string} today the Manila business date, YYYY-MM-DD
 */
export function sectionCards(cards, filter, today) {
  const list = Array.isArray(cards) ? cards : [];
  if (filter === 'completed') {
    return { overdue: [], today: [], upcoming: [], past: list.filter((c) => norm(c?.status) === 'completed') };
  }
  const open = list.filter((c) => !isDone(c));
  const inSection = (name) => open.filter((c) => cardSection(c, today) === name);
  return { overdue: inSection('overdue'), today: inSection('today'), upcoming: inSection('upcoming'), past: [] };
}

/**
 * What the Chauffeur dashboard's vehicle and "current trip info" tiles show for today: the same card (and so the
 * same fleet and status) as the Assigned Routes list. Null when nothing is scheduled today.
 */
export function todaySummary(cards, today) {
  const todays = (Array.isArray(cards) ? cards : []).filter((c) => cardSection(c, today) === 'today' && norm(c?.status) !== 'cancelled');
  if (todays.length === 0) return null;
  const pick = [...todays].sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || String(a.start_time || '').localeCompare(String(b.start_time || '')))[0];
  const schedule = pick.start_time
    ? (pick.legs_count > 1 && pick.end_time && pick.end_time !== pick.start_time ? `${pick.start_time} - ${pick.end_time}` : pick.start_time)
    : null;
  return {
    plate: pick.plate_number || null,
    route: pick.route_name || null,
    status: pick.status || null,
    schedule,
  };
}

/** The Operator's status filter works on the same derived status the cards show (same groups as the server). */
const FILTER_GROUPS = {
  scheduled: ['scheduled', 'delayed'],
  in_progress: ['boarding', 'departed', 'in-progress', 'in_progress'],
  completed: ['completed'],
  cancelled: ['cancelled'],
};

export function matchesStatusFilter(status, filter) {
  if (!filter || filter === 'all') return true;
  return (FILTER_GROUPS[filter] || [filter]).includes(norm(status));
}
