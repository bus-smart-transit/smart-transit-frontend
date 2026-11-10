import { ROUTE_INFO } from "../data/sampleData.js";

// Client-side filtering of the trips the frontend has loaded:
// departure time of day and bus type.

// "1:30 PM" -> minutes since midnight
export function timeToMinutes(time) {
  const match = /(\d+):(\d+)\s*(AM|PM)/i.exec(time ?? "");
  if (!match) return Number.POSITIVE_INFINITY;
  const [, h, m, period] = match;
  return ((Number(h) % 12) + (period.toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m);
}

export const TIME_SLOTS = [
  { id: "morning", label: "Morning", hint: "Before 12 PM", test: (min) => min < 12 * 60 },
  { id: "afternoon", label: "Afternoon", hint: "12 PM – 6 PM", test: (min) => min >= 12 * 60 && min < 18 * 60 },
  { id: "evening", label: "Evening", hint: "6 PM onwards", test: (min) => min >= 18 * 60 },
];

// Davao Metro Shuttle bus classes.
export const BUS_TYPES = [
  { id: "ordinary", label: "Ordinary" },
  { id: "aircon", label: "Airconditioned" },
  { id: "deluxe", label: "Deluxe" },
  { id: "super-deluxe", label: "Super Deluxe" },
  { id: "luxury", label: "Luxury" },
];

// A trip's own busType if it has one, otherwise the route's bus type
// from the existing route data (currently "Aircon" for Ecoland–Tagum).
export function tripBusType(trip) {
  const type = (trip.busType ?? ROUTE_INFO.bus ?? "").toLowerCase();
  if (type.includes("super")) return "super-deluxe";
  if (type.includes("deluxe")) return "deluxe";
  if (type.includes("luxury")) return "luxury";
  if (type.includes("air")) return "aircon";
  if (type.includes("ordinary") || type.includes("regular")) return "ordinary";
  return null;
}

export const busTypeLabel = (trip) => BUS_TYPES.find((t) => t.id === tripBusType(trip))?.label ?? null;

export const defaultFilters = () => ({ times: [], busTypes: [] });

export const countActiveFilters = (filters) => filters.times.length + filters.busTypes.length;

export function applyFilters(trips, filters) {
  return trips.filter((trip) => {
    const minutes = timeToMinutes(trip.departure);
    if (filters.times.length && !TIME_SLOTS.some((s) => filters.times.includes(s.id) && s.test(minutes))) return false;
    if (filters.busTypes.length && !filters.busTypes.includes(tripBusType(trip))) return false;
    return true;
  });
}
