import { Link } from 'react-router-dom';
import { ArrowRight, Bus, MapPin } from 'lucide-react';
import { routeHref } from '../../../utils/routePages';
import { routeColor } from '../../../utils/routeColors';

/**
 * One route as a card that opens the route's own page: its name, ends, the towns it stops in (when given), its stop
 * count and bus companies, edged in the route's own colour. Shared by a province's routes and "View all routes".
 */
export default function RouteCard({ route }) {
  return (
    <Link
      to={routeHref(route.route_id)}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-teal-300 hover:shadow-card-hover"
      style={{ borderLeft: `6px solid ${routeColor(route.route_id, route.color)}` }}
    >
      <span className="font-display text-lg font-bold text-navy-950">{route.route_name}</span>
      <span className="mt-1 text-sm text-slate-600">{route.origin} → {route.destination}</span>
      {route.towns_in_province?.length > 0 && (
        <span className="mt-3 flex items-start gap-1.5 text-xs text-slate-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
          <span>Stops in {route.towns_in_province.join(', ')}</span>
        </span>
      )}
      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
        <Bus size={14} className="shrink-0 text-teal-600" aria-hidden="true" />
        {route.stop_count} stops{route.bus_companies?.length ? ` · ${route.bus_companies.join(', ')}` : ''}
      </span>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:text-teal-800">
        View route <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
