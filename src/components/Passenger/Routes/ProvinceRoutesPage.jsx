import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Bus, MapPin } from 'lucide-react';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import { useRegion } from '../../../api/hooks/useRegion';
import { useProvinceRoutes } from '../../../api/hooks/Passenger/usePublicRoutes';
import { provinceFromSlug, routeHref } from '../../../utils/routePages';
import { routeColor } from '../../../utils/routeColors';
import { SkeletonList } from '../../ui/Skeleton';

/**
 * 2026-11-20 (user): a province picture on the homepage opens this page: the routes a bus runs through the province,
 * each with the province's towns it stops in, opening the route's own page. Renders only; the server lists the routes.
 */
export default function ProvinceRoutesPage() {
  const { slug } = useParams();
  const region = useRegion();
  const province = provinceFromSlug(slug, region?.provinces);
  const { loading, data, error } = useProvinceRoutes(province);
  const routes = data?.routes ?? [];
  const regionLoaded = Boolean(region?.provinces);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-8 sm:py-10">
        <div className="container-page">
          <Link to="/" className="text-sm font-semibold text-teal-700 hover:text-teal-800">Back to home</Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-navy-950 sm:text-3xl">{province || 'Routes'}</h1>
          <p className="mt-1 text-sm text-slate-500">The routes our buses run through {province || 'this province'}. Open one to see its stops and today&apos;s trips.</p>

          {regionLoaded && !province && (
            <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" data-testid="province-unknown">We do not serve that place yet.</p>
          )}
          {(!regionLoaded || (province && loading)) && <div className="mt-6"><SkeletonList rows={3} /></div>}
          {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {province && !loading && !error && routes.length === 0 && (
            <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" data-testid="province-no-routes">No bus runs through {province} yet.</p>
          )}

          {routes.length > 0 && (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="province-routes">
              {routes.map((route) => (
                <li key={route.route_id}>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
