import { useState } from "react";
import { MapPinIcon, LocationIcon, CloseIcon } from "./Icons.jsx";
import Card from "./ui/Card.jsx";
import Button from "./ui/Button.jsx";
import { TripCard } from "./TripList.jsx";
import { useUserLocation } from "../context/LocationContext.jsx";
import { formatKm, stopsByDistance } from "../utils/geo.js";

const NEARBY_COUNT = 3;

// "Terminals Near You": a suggestion shown above All Available Trips.
// It never hides or filters trips; it only puts the closest terminals first.
export default function NearbyTerminals({ trips, onBookSeat }) {
  const { location, notice, isLocating, requestLocation, chooseLocation, dismissNotice } = useUserLocation();
  // "auto" = open the nearest terminal that has trips.
  const [expanded, setExpanded] = useState("auto");

  if (!location) {
    return (
      <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 p-5 sm:p-6">
        {notice && (
          <div
            role="status"
            className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200"
          >
            <p>{notice}</p>
            <button type="button" onClick={dismissNotice} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">
              <CloseIcon size={16} />
            </button>
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-navy-800 ring-1 ring-navy-100">
              <LocationIcon size={20} />
            </span>
            <div>
              <p className="font-display font-bold text-navy-950">Find terminals near you</p>
              <p className="text-sm text-slate-500">Share your location or choose your city to see the closest terminals first.</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={requestLocation} disabled={isLocating}>
              Use my location
            </Button>
            <Button variant="outline" size="sm" onClick={chooseLocation}>
              Choose city
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const terminals = stopsByDistance(location.point, { terminalsOnly: true }).slice(0, NEARBY_COUNT);
  const fromGps = location.source === "gps";
  const hasTrips = (terminal) => trips.some((trip) => trip.origin === terminal.name);
  const openCode = expanded === "auto" ? terminals.find(hasTrips)?.code ?? null : expanded;

  return (
    <section aria-labelledby="nearby-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="nearby-heading" className="font-display text-xl font-bold text-navy-950">
            Terminals Near You
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {fromGps
              ? "Here are the nearest terminals based on your current location."
              : `Here are the nearest terminals to ${location.municipality}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
            <MapPinIcon size={13} />
            {location.municipality}
          </span>
          <button type="button" onClick={chooseLocation} className="text-xs font-semibold text-navy-700 underline underline-offset-2 hover:text-navy-900">
            Change
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {terminals.map((terminal, index) => {
          const terminalTrips = trips.filter((trip) => trip.origin === terminal.name);
          const isOpen = openCode === terminal.code;

          return (
            <Card
              key={terminal.code}
              className={`p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover ${
                isOpen ? "ring-2 ring-navy-700" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-navy-950">
                  <MapPinIcon size={17} className="shrink-0 text-navy-700" />
                  {terminal.name}
                </span>
                {index === 0 && (
                  <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                    Nearest
                  </span>
                )}
              </div>
              <p className="mt-1 pl-6 text-xs text-slate-500">
                {terminal.municipality}, {terminal.province}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 pl-6">
                <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-800">
                  {fromGps
                    ? `~${formatKm(terminal.distanceKm)} away`
                    : terminal.municipality === location.municipality
                      ? `In ${location.municipality}`
                      : `~${formatKm(terminal.distanceKm)} from ${location.municipality}`}
                </span>
                {terminalTrips.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : terminal.code)}
                    aria-expanded={isOpen}
                    className="text-xs font-semibold text-navy-700 hover:text-navy-950"
                  >
                    {isOpen ? "Hide trips" : `View ${terminalTrips.length} trips →`}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">No trips listed yet</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {terminals.map((terminal) =>
        openCode === terminal.code ? (
          <div key={terminal.code} className="mt-4 animate-fade-in space-y-3">
            <p className="text-sm font-semibold text-navy-800">Trips from {terminal.name}</p>
            {trips
              .filter((trip) => trip.origin === terminal.name)
              .map((trip) => (
                <TripCard key={trip.id} trip={trip} onBookSeat={onBookSeat} />
              ))}
          </div>
        ) : null
      )}
    </section>
  );
}
