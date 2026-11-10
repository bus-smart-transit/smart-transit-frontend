import { ROUTE_STOPS } from "../data/sampleData.js";
import { addMinutes, BOARDING_STOPS, calculateUnitFare, findStop } from "../utils/route.js";
import { PlusIcon, MinusIcon } from "./Icons.jsx";

const FIRST_STOP = BOARDING_STOPS[0].id;
const LAST_STOP = BOARDING_STOPS[BOARDING_STOPS.length - 1].id;

const LEGEND = [
  { label: "Stop", dot: "border-2 border-slate-400 bg-white" },
  { label: "Passes by only", dot: "bg-slate-200" },
  { label: "Your drop-off", dot: "bg-amber-400" },
];

// Collapsible "View Route Stops" panel for a trip card. Lists every stop on
// the route with its scheduled time, and lets the passenger choose where to
// get off. Only stops where the bus actually stops can be chosen.
export default function RouteStops({ trip, open, onToggle, dropOffId, onDropOffChange }) {
  const dropOff = findStop(dropOffId) ?? findStop(LAST_STOP);
  const fare = calculateUnitFare(trip.fare, FIRST_STOP, dropOff.id);
  const panelId = `route-stops-${trip.id}`;

  return (
    <div className="border-t border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-5 py-3 text-left text-sm font-semibold text-navy-800 transition-colors hover:bg-slate-100 sm:px-6"
      >
        <span>
          View Route Stops
          {dropOff.id !== LAST_STOP && (
            <span className="ml-2 font-medium text-amber-700">· Getting off at {dropOff.name}</span>
          )}
        </span>
        {open ? <MinusIcon size={18} /> : <PlusIcon size={18} />}
      </button>

      {open && (
        <div id={panelId} className="animate-fade-in px-4 pb-4 pt-3 sm:px-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-3 text-xs text-slate-500">
            {LEGEND.map(({ label, dot }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full ${dot}`} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">Tap a stop to choose where you get off.</p>

          <ol className="mt-2 space-y-1.5">
            {ROUTE_STOPS.map((stop) => {
              const isBoarding = stop.id === FIRST_STOP;
              const isDropOff = stop.id === dropOff.id;
              const selectable = stop.type !== "pass" && !isBoarding;
              const time = addMinutes(trip.departure, stop.offset);

              const rowClass = isDropOff
                ? "border-amber-300 bg-amber-50"
                : isBoarding
                  ? "border-slate-200 bg-slate-50"
                  : "border-transparent";

              const content = (
                <>
                  <span
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full ${
                      isDropOff
                        ? "bg-amber-400 ring-4 ring-amber-100"
                        : stop.type === "pass"
                          ? "bg-slate-200"
                          : "border-2 border-slate-400 bg-white"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy-950">{stop.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      {stop.area}
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          stop.type === "pass" ? "bg-slate-100 text-slate-500" : "bg-navy-50 text-navy-800"
                        }`}
                      >
                        {stop.type === "terminal" ? "Terminal" : stop.type === "stop" ? "Stop" : "Passes by"}
                      </span>
                      {isBoarding && (
                        <span className="rounded-md bg-teal-100 px-2 py-0.5 font-semibold text-teal-800">
                          You board here
                        </span>
                      )}
                      {isDropOff && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                          You get off here
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-navy-950">{time}</span>
                </>
              );

              return (
                <li key={stop.id}>
                  {selectable ? (
                    <button
                      type="button"
                      onClick={() => onDropOffChange(stop.id)}
                      aria-pressed={isDropOff}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${rowClass}`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${rowClass}`}>
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-navy-50 px-4 py-3 text-sm">
            <span className="text-navy-900">
              {findStop(FIRST_STOP).name} → <span className="font-semibold">{dropOff.name}</span>
            </span>
            <span className="font-display font-bold text-navy-950">₱{fare} per passenger</span>
          </div>
        </div>
      )}
    </div>
  );
}
