// Batch 28, item 1: how the Driver / Chauffeur dashboards group their assignment cards.

const isDone = (card) => ['completed', 'cancelled'].includes(String(card?.status || '').toLowerCase());

/**
 * Today's section also holds anything still open from an earlier day (so a block that was never
 * finished is not hidden); "completed" lists the finished ones; everything later is "upcoming".
 *
 * @param {Array} cards the server's assignment cards
 * @param {'all'|'scheduled'|'completed'} filter the dashboard's filter control
 * @param {string} today the Manila business date, YYYY-MM-DD
 */
export function sectionCards(cards, filter, today) {
  const list = Array.isArray(cards) ? cards : [];
  if (filter === 'completed') {
    return { today: list.filter((c) => String(c?.status).toLowerCase() === 'completed'), upcoming: [] };
  }
  const open = list.filter((c) => !isDone(c));
  return {
    today: open.filter((c) => String(c.scheduled_date) <= today),
    upcoming: open.filter((c) => String(c.scheduled_date) > today),
  };
}
