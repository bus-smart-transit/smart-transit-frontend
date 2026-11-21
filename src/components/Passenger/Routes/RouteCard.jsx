import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { routeHref } from '../../../utils/routePages';
import { routeColor } from '../../../utils/routeColors';

/**
 * One route as a card that opens the route's own page. 2026-11-21 (user): only the route and the company that runs it,
 * edged in the route's own colour. Shared by a province's routes and "View all routes".
 */
export default function RouteCard({ route }) {
  return (
    <Link
      to={routeHref(route.route_id)}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-teal-300 hover:shadow-card-hover"
      style={{ borderLeft: `6px solid ${routeColor(route.route_id, route.color)}` }}
    >
      <span className="font-display text-lg font-bold text-navy-950">{route.route_name}</span>
      <span className="mt-2 flex items-center gap-1.5 text-sm text-slate-600" data-testid="route-card-company">
        <Building2 size={14} className="shrink-0 text-teal-600" aria-hidden="true" />
        {route.company_name || 'Not provided'}
      </span>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:text-teal-800">
        View route <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
