import { getBusinessToday } from './dates';

export const STATUS_COLOR = {
  scheduled: '#153a6b',
  delayed: '#e11d48',
  boarding: '#3b82f6',
  departed: '#f59e0b',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

/** How the signed-in role is called in the portal (a conductor is a Chauffeur). */
export const ROLE_LABEL = { driver: 'Driver', conductor: 'Chauffeur', operator: 'Operator' };

/** 'HH:MM' from a time that may carry seconds, or '' when there is none. */
export const formatTime = (value) => String(value || '').match(/^(\d{2}:\d{2})/)?.[1] ?? '';

/** Long label for a business-day key, formatted without the browser timezone. */
export const formatDayLabel = (dateKey) => {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

/** First day of the month containing a 'YYYY-MM-DD' key (falls back to the Manila today). */
export const monthStartOf = (dateKey) => {
  const match = String(dateKey || getBusinessToday()).match(/^(\d{4})-(\d{2})/);
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
};

/** The month before/after, as the first day of that month. */
export const shiftMonth = (monthStart, delta) => new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1);
