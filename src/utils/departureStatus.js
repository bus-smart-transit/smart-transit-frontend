import { timeToMinutes } from "./tripFilters.js";

// Philippine time is UTC+8 all year (no daylight saving).
const MANILA_OFFSET = "+08:00";
// BOARDING SOON shows during the last 15 minutes before departure.
export const BOARDING_SOON_MINUTES = 15;

// Today's date in Manila as "YYYY-MM-DD", whatever the device's own timezone.
export function manilaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
}

// "2026-11-10" + "7:00 AM" -> the exact moment, as a Date
export function departureInstant(isoDate, time) {
  const minutes = timeToMinutes(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate ?? "") || !Number.isFinite(minutes)) return null;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return new Date(`${isoDate}T${hh}:${mm}:00${MANILA_OFFSET}`);
}

// "2026-11-10" -> "Tue, Nov 10, 2026"
export function formatTravelDay(isoDate) {
  const d = departureInstant(isoDate, "12:00 PM");
  if (!d) return isoDate;
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// The only status shown on a trip card: BOARDING SOON, from 15 minutes
// down to the scheduled departure. Any other time there is no status.
export function getDepartureStatus(trip, isoDate, now = new Date()) {
  const departs = departureInstant(isoDate, trip.departure);
  if (!departs) return null;
  const msLeft = departs.getTime() - now.getTime();
  if (msLeft <= 0 || msLeft > BOARDING_SOON_MINUTES * 60000) return null;

  const minutes = Math.ceil(msLeft / 60000);
  const left = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return {
    label: `${left} before departure`,
    description: `This bus will depart in approximately ${left}. Please proceed to the terminal.`,
  };
}
