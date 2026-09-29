import { BusIcon } from "./Icons.jsx";
import { ROUTE_INFO, ROUTE_STOPS } from "../data/sampleData.js";
import { addMinutes } from "../utils/route.js";

// Timeline of every stop on the trip. `originId` / `destinationId` mark where the
// passenger boards and gets off.
export default function TravelAdvice({ trip, originId, destinationId }) {
  const stopCount = ROUTE_STOPS.filter((stop) => stop.type === "stop").length;
  const lastIndex = ROUTE_STOPS.length - 1;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-navy-950">Travel Advice</h2>
        <p className="text-sm text-slate-400">
          {trip.duration} · {stopCount} stops
        </p>
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-xl bg-navy-50 px-4 py-2.5 text-sm font-medium text-navy-800">
        <BusIcon size={16} className="shrink-0" />
        {trip.bus} · {ROUTE_INFO.bus} · {ROUTE_INFO.via} · {ROUTE_INFO.bound}
      </p>

      <ol className="mt-5">
        {ROUTE_STOPS.map((stop, index) => {
          const isTerminal = stop.type === "terminal";
          const isStop = stop.type === "stop";
          const isMajor = isTerminal || isStop;
          const isBoarding = stop.id === originId;
          const isDropOff = stop.id === destinationId;

          const details = [stop.area];
          if (index > 0 && isMajor) details.push(`${stop.km} km`);
          if (index === 0) details.push("0 km", "Boarding");
          if (index === lastIndex) details.push("Drop-off");

          return (
            <li key={stop.id} className="grid grid-cols-[4.5rem_1.5rem_1fr] gap-x-3">
              <span
                className={`pt-0.5 text-right text-sm ${
                  isMajor ? "font-bold text-navy-950" : "text-slate-400"
                }`}
              >
                {addMinutes(trip.departure, stop.offset)}
              </span>

              {/* Marker + connecting line */}
              <span className="relative flex justify-center">
                {index < lastIndex && (
                  <span className="absolute left-1/2 top-3 h-full w-0.5 -translate-x-1/2 bg-navy-700" />
                )}
                <span
                  className={`relative z-10 rounded-full ${
                    isTerminal
                      ? "mt-1 h-4 w-4 bg-navy-700"
                      : isStop
                      ? "mt-1 h-4 w-4 border-2 border-navy-700 bg-white"
                      : "mt-1.5 h-2.5 w-2.5 border border-slate-400 bg-white"
                  }`}
                />
              </span>

              <div className={index < lastIndex ? "pb-4" : ""}>
                <p className="flex flex-wrap items-center gap-2">
                  <span className={isMajor ? "font-semibold text-navy-950" : "text-sm text-slate-600"}>
                    {stop.name}
                  </span>
                  {isStop && (
                    <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-700">
                      Stop
                    </span>
                  )}
                  {isBoarding && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                      You board here
                    </span>
                  )}
                  {isDropOff && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                      You get off here
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{details.join(" · ")}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-navy-700" /> Terminal
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-navy-700 bg-white" /> Stop (drop-off &amp; pick-up)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-slate-400 bg-white" /> Pass-through only
        </span>
      </div>
    </div>
  );
}
