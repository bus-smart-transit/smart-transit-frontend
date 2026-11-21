import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { routeHref } from '../../../utils/routePages';
import { routeColor } from '../../../utils/routeColors';

/**
 * 2026-11-21 (user): one card per pair of ends ("{first stop} → {last stop}"), listing the companies that run it;
 * each company opens its own route page (companies keep their own stops, trips and fares). The server groups the
 * routes (PublicRouteService groups: same start town and end town). Shared by a province's routes and "View all routes".
 */
export default function RouteCard({ group }) {
  const routes = Array.isArray(group?.routes) ? group.routes : [];
  const first = routes[0];
  // A company that runs two routes with the same ends: the route name tells them apart.
  const repeated = (name) => routes.filter((route) => route.company_name === name).length > 1;

  return (
    <div
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
      style={{ borderLeft: `6px solid ${routeColor(first?.route_id, group?.color)}` }}
      data-testid="route-card"
    >
      <h3 className="font-display text-lg font-bold text-navy-950">{group?.title || first?.route_name || 'Route'}</h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{routes.length === 1 ? 'Company' : 'Companies'}</p>
      <ul className="mt-1 divide-y divide-slate-100">
        {routes.map((route) => (
          <li key={route.route_id}>
            <Link
              to={routeHref(route.route_id)}
              className="group flex min-h-11 items-center justify-between gap-2 py-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
              data-testid="route-card-company"
            >
              <span>
                {route.company_name || 'Not provided'}
                {repeated(route.company_name) && <span className="block text-xs font-normal text-slate-500">{route.route_name}</span>}
              </span>
              <ChevronRight size={16} className="shrink-0 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
