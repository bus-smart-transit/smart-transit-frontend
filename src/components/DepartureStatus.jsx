import { useEffect, useState } from "react";
import { getDepartureStatus } from "../utils/departureStatus.js";

// Re-render on a timer so the status appears and counts down by itself.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

// BOARDING SOON box, shown in a trip card during the last 15 minutes
// before departure. Renders nothing at any other time.
export default function DepartureStatus({ trip, travelDate, className = "" }) {
  const now = useNow();
  const status = getDepartureStatus(trip, travelDate, now);
  if (!status) return null;

  return (
    <div
      className={`rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-orange-800">
          Boarding Soon
        </span>
        <span className="text-sm font-bold text-slate-900">{status.label}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{status.description}</p>
    </div>
  );
}
