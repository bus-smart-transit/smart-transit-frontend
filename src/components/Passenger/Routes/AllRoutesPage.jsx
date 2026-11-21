import { Link } from 'react-router-dom';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import { useAllRoutes } from '../../../api/hooks/Passenger/usePublicRoutes';
import { provinceHref } from '../../../utils/routePages';
import { SkeletonList } from '../../ui/Skeleton';
import RouteCard from './RouteCard';

/**
 * 2026-11-21 (user): "View all routes" on the homepage opens this page: every province a bus runs through, each with
 * its routes (a route crossing provinces shows under each). A route opens its own page, as from a province picture.
 * Renders only; the server lists the routes (GET routes/all).
 */
export default function AllRoutesPage() {
  const { loading, data, error } = useAllRoutes();
  const provinces = data?.provinces ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-8 sm:py-10">
        <div className="container-page">
          <Link to="/" className="text-sm font-semibold text-teal-700 hover:text-teal-800">Back to home</Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-navy-950 sm:text-3xl">All routes</h1>
          <p className="mt-1 text-sm text-slate-500">Every route our buses run, by province. Open one to see its stops and today&apos;s trips.</p>

          {loading && <div className="mt-6"><SkeletonList rows={3} /></div>}
          {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          {!loading && !error && provinces.length === 0 && (
            <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" data-testid="all-routes-none">No bus runs a route yet.</p>
          )}

          {provinces.map((group) => (
            <section key={group.province} className="mt-8" aria-labelledby={`province-${group.province}`} data-testid="all-routes-province">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`province-${group.province}`} className="font-display text-xl font-bold text-navy-950">{group.province}</h2>
                <Link to={provinceHref(group.province)} aria-label={`${group.routes.length} ${group.routes.length === 1 ? 'route' : 'routes'} in ${group.province}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                  {group.routes.length} {group.routes.length === 1 ? 'route' : 'routes'}
                </Link>
              </div>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                {group.routes.map((route) => <li key={route.route_id}><RouteCard route={route} /></li>)}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
