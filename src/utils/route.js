import { ROUTE_STOPS } from "../data/sampleData.js";

export const MIN_FARE = 15;

// Stops where passengers can get on or off (terminals + regular stops).
export const BOARDING_STOPS = ROUTE_STOPS.filter((stop) => stop.type !== "pass");

export const findStop = (id) => ROUTE_STOPS.find((stop) => stop.id === id) ?? null;

// "7:00 AM" + 50 minutes → "7:50 AM"
export function addMinutes(time, minutes) {
  const [, h, m, period] = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let total = ((Number(h) % 12) + (period.toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m) + minutes;
  total = ((total % 1440) + 1440) % 1440;
  const hours24 = Math.floor(total / 60);
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(total % 60).padStart(2, "0")} ${hours24 < 12 ? "AM" : "PM"}`;
}

// Fare for one passenger between two stops: the full-route fare scaled by distance,
// rounded to the nearest peso and never below MIN_FARE.
export function calculateUnitFare(fullFare, originId, destinationId) {
  const origin = findStop(originId);
  const destination = findStop(destinationId);
  if (!origin || !destination || destination.km <= origin.km) return 0;

  const totalKm = ROUTE_STOPS[ROUTE_STOPS.length - 1].km;
  const scaled = Math.round((fullFare * (destination.km - origin.km)) / totalKm);
  return Math.min(fullFare, Math.max(MIN_FARE, scaled));
}

// "2026-06-10" → "Jun 10, 2026"
export const formatTravelDate = (iso) =>
  new Date(`${iso}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
