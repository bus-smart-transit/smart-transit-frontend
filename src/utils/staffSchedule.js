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

/** 'YYYY-MM-DD' business day of a trip, or '' when it has none. */
export const tripDateKey = (trip) => String(trip?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';

const toCompactTime = (value) => {
  const text = String(value || '').trim();
  return text.match(/^(\d{2}:\d{2})(?::\d{2})?$/)?.[1] ?? text;
};

/** "YYYY/MM/DD - HH:MM" from the trip's own date and departure time. */
export const formatTripSchedule = (trip) => {
  if (!trip) return '-';
  const key = tripDateKey(trip);
  const dateLabel = key ? key.replaceAll('-', '/') : '-';
  const time = toCompactTime(trip.departure_time || trip.fleet_route?.start_time);
  return time ? `${dateLabel} - ${time}` : dateLabel;
};

/** Long label for a business-day key, formatted without the browser timezone. */
export const formatDayLabel = (dateKey) => {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

export const groupTripsByDate = (trips) => (trips || []).reduce((acc, trip) => {
  const key = tripDateKey(trip);
  if (key) (acc[key] ??= []).push(trip);
  return acc;
}, {});

/** Upcoming (today onward, soonest first) and past (most recent first) trips, by Manila day. */
export const splitSchedule = (trips, today = getBusinessToday()) => {
  const sorted = [...(trips || [])].sort((a, b) => tripDateKey(a).localeCompare(tripDateKey(b)));
  return {
    upcoming: sorted.filter((trip) => tripDateKey(trip) >= today),
    past: sorted.filter((trip) => tripDateKey(trip) < today).reverse(),
  };
};

/** First day of the month containing a 'YYYY-MM-DD' key (falls back to the Manila today). */
export const monthStartOf = (dateKey) => {
  const match = String(dateKey || getBusinessToday()).match(/^(\d{4})-(\d{2})/);
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
};
