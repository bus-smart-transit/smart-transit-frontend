import { Link, useParams } from 'react-router-dom';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import RouteMap from '../../Map/RouteMap';
import ServiceTypeChip from '../../ui/ServiceTypeChip';
import { SkeletonList } from '../../ui/Skeleton';
import { useRoutePage } from '../../../api/hooks/Passenger/usePublicRoutes';
import { departureBookingHref, stopsForDirection } from '../../../utils/routePages';
import { tripsFromStopHref } from '../../../utils/publicTrackingView';
import { routeColor } from '../../../utils/routeColors';
import { busLabelText } from '../../../utils/busLabel';
import { clock12 } from '../../../utils/clock';

const STATUS_TEXT = { delayed: 'Delayed', boarding: 'Boarding now', departed: 'On the road', 'in-progress': 'On the road' };

/**
 * 2026-11-20 (user): a route's own page: its line on the map, every stop in order with its town ("Trips from here"),
 * and today's departures both ways ("Book"). It replaces the route stops panel that lived in each trip card on All
 * available trips. Renders only; useRoutePage loads, routePages shapes the links.
 */
export default function RoutePage() {
  const { routeId } = useParams();
  const { loading, route, stops, departures, error } = useRoutePage(routeId);
  const ordered = stopsForDirection(stops, 'outbound');
  const color = routeColor(routeId, route?.color);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-8 sm:py-10">
        <div className="container-page">
          <Link to="/passenger/trips" className="text-sm font-semibold text-teal-700 hover:text-teal-800">All available trips</Link>
          {loading && <div className="mt-4"><SkeletonList rows={4} /></div>}
          {!loading && (error || !route) && (
            <p role="alert" className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" data-testid="route-missing">
              {error || 'This route could not be found.'}
            </p>
          )}

          {route && (
            <>
              <div className="mt-2 flex items-start gap-3">
                <span className="mt-2 h-3 w-10 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">{route.route_name}</h1>
                  <p className="mt-1 text-sm text-slate-600">{route.origin} → {route.destination}</p>
                  {(route.provinces?.length > 0 || route.bus_companies?.length > 0) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {[route.provinces?.join(', '), route.bus_companies?.join(', ')].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                  <RouteMap routeId={Number(routeId)} showStatus={false} className="relative h-80 w-full sm:h-96" />
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card" aria-labelledby="departures-heading" data-testid="route-departures">
                  <h2 id="departures-heading" className="font-display text-lg font-bold text-navy-950">Today&apos;s trips</h2>
                  {departures.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No more trips on this route today.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {departures.map((departure) => {
                        const href = departureBookingHref(departure, stops);
                        const status = STATUS_TEXT[departure.status];
                        return (
                          <li key={departure.trip_id} className="flex items-start justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="font-data text-base font-bold text-navy-950">{clock12(departure.departure_time) || departure.departure_time}</p>
                              <p className="break-words text-sm text-slate-700">{departure.from} → {departure.to}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                <span>{busLabelText(departure.bus_label)}</span>
                                <ServiceTypeChip serviceType={departure.service_type} />
                                {status && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">{status}</span>}
                              </p>
                            </div>
                            {href && !['departed', 'in-progress'].includes(departure.status) && (
                              <Link to={href} className="shrink-0 rounded-full bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900">Book</Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card" aria-labelledby="stops-heading" data-testid="route-stops">
                <h2 id="stops-heading" className="font-display text-lg font-bold text-navy-950">Stops ({ordered.length})</h2>
                <ol className="mt-3 space-y-0">
                  {ordered.map((stop, index) => (
                    <li key={stop.stop_id} className="flex items-center justify-between gap-3 border-l-4 py-2.5 pl-4" style={{ borderColor: color }}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          <span className="font-data mr-2 text-xs text-slate-500">{index + 1}</span>
                          {stop.stop_name}
                          {stop.stop_type === 'terminal' && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Terminal</span>}
                        </p>
                        {stop.municipality && <p className="text-xs text-slate-500">{stop.municipality}</p>}
                      </div>
                      {stop.stop_code && (
                        <Link to={tripsFromStopHref(stop.stop_code)} className="shrink-0 text-xs font-semibold text-teal-700 hover:text-teal-800">Trips from here</Link>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
