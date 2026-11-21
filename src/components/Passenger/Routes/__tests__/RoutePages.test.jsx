import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProvinceRoutesPage from '../ProvinceRoutesPage';
import RoutePage from '../RoutePage';
import AllRoutesPage from '../AllRoutesPage';
import { useAllRoutes, useProvinceRoutes, useRoutePage } from '../../../../api/hooks/Passenger/usePublicRoutes';

// 2026-11-20 (user): a province picture opens its routes; a route has its own page. SAMPLE places and times.
vi.mock('../../../Layout/Navbar', () => ({ default: () => null }));
vi.mock('../../../Layout/Footer', () => ({ default: () => null }));
vi.mock('../../../Map/RouteMap', () => ({ default: () => <div data-testid="route-map" /> }));
vi.mock('../../../../api/hooks/useRegion', () => ({ useRegion: () => ({ provinces: { 'Sample Oriental': ['East Town'] } }) }));
vi.mock('../../../../api/hooks/Passenger/usePublicRoutes', () => ({ useProvinceRoutes: vi.fn(), useRoutePage: vi.fn(), useAllRoutes: vi.fn() }));

const at = (path, element, pattern) => render(
  <MemoryRouter initialEntries={[path]}><Routes><Route path={pattern} element={element} /></Routes></MemoryRouter>,
);

describe('ProvinceRoutesPage', () => {
  it('lists the province routes, each opening its route page', () => {
    useProvinceRoutes.mockReturnValue({ loading: false, error: '', data: { province: 'Sample Oriental', routes: [
      { route_id: 8, route_name: 'Sample City to East Town', origin: 'Sample City Terminal', destination: 'East Town Terminal', stop_count: 9, towns_in_province: ['East Town'], bus_companies: ['Sample Lines'] },
    ] } });
    at('/provinces/sample-oriental', <ProvinceRoutesPage />, '/provinces/:slug');

    expect(useProvinceRoutes).toHaveBeenLastCalledWith('Sample Oriental');
    expect(screen.getByRole('heading', { name: 'Sample Oriental' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sample City to East Town/ })).toHaveAttribute('href', '/routes/8');
    expect(screen.getByText('Stops in East Town')).toBeInTheDocument();
  });

  it('says plainly when the place is not served', () => {
    useProvinceRoutes.mockReturnValue({ loading: false, error: '', data: null });
    at('/provinces/nowhere', <ProvinceRoutesPage />, '/provinces/:slug');

    expect(screen.getByTestId('province-unknown')).toHaveTextContent('We do not serve that place yet.');
  });
});

describe('RoutePage', () => {
  it('shows the route, its stops with Trips from here, and today\'s trips with Book', () => {
    useRoutePage.mockReturnValue({
      loading: false, error: '',
      route: { route_id: 8, route_name: 'Sample City to East Town', origin: 'Sample City Terminal', destination: 'East Town Terminal', provinces: ['Sample Oriental'], bus_companies: [] },
      stops: [
        { stop_id: 1, stop_code: 'city-terminal', stop_name: 'City Terminal', municipality: 'Sample City', stop_order: 1, stop_type: 'terminal' },
        { stop_id: 2, stop_code: 'east-terminal', stop_name: 'East Terminal', municipality: 'East Town', stop_order: 2, stop_type: 'terminal' },
      ],
      departures: [{ trip_id: 40, trip_date: '2026-11-21', departure_time: '21:40', from: 'Sample City Terminal', to: 'East Town Terminal', direction: 'outbound', service_type: 'regular', bus_label: null, status: 'delayed' }],
    });
    at('/routes/8', <RoutePage />, '/routes/:routeId');

    expect(screen.getByRole('heading', { name: 'Sample City to East Town' })).toBeInTheDocument();
    expect(screen.getByTestId('route-map')).toBeInTheDocument();
    expect(screen.getByTestId('route-stops')).toHaveTextContent('City Terminal');
    expect(screen.getAllByRole('link', { name: 'Trips from here' })[0]).toHaveAttribute('href', '/passenger/trips?from=city-terminal');
    expect(screen.getByTestId('route-departures')).toHaveTextContent('9:40 PM');
    expect(screen.getByTestId('route-departures')).toHaveTextContent('Delayed');
    expect(screen.getByRole('link', { name: 'Book' })).toHaveAttribute('href', '/passenger/book?from=city-terminal&to=east-terminal&date=2026-11-21&time=21%3A40');
  });

  it('says plainly when the route is not found', () => {
    useRoutePage.mockReturnValue({ loading: false, error: '', route: null, stops: [], departures: [] });
    at('/routes/999', <RoutePage />, '/routes/:routeId');

    expect(screen.getByTestId('route-missing')).toHaveTextContent('This route could not be found.');
  });
});

// 2026-11-21 (user): "View all routes" on the homepage.
describe('AllRoutesPage', () => {
  it('lists every route under each province it runs through, each opening its route page', () => {
    const route = { route_id: 8, route_name: 'Sample City to East Town', origin: 'Sample City Terminal', destination: 'East Town Terminal', stop_count: 9, bus_companies: ['Sample Lines'] };
    useAllRoutes.mockReturnValue({ loading: false, error: '', data: { provinces: [
      { province: 'Sample Oriental', routes: [{ ...route, towns_in_province: ['East Town'] }] },
      { province: 'Sample City', routes: [{ ...route, towns_in_province: ['Sample City'] }] },
    ] } });
    at('/routes', <AllRoutesPage />, '/routes');

    expect(screen.getAllByTestId('all-routes-province')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Sample Oriental' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Sample City to East Town/ })[0]).toHaveAttribute('href', '/routes/8');
    expect(screen.getByRole('link', { name: '1 route in Sample Oriental' })).toHaveAttribute('href', '/provinces/sample-oriental');
  });

  it('says plainly when no bus runs a route yet', () => {
    useAllRoutes.mockReturnValue({ loading: false, error: '', data: { provinces: [] } });
    at('/routes', <AllRoutesPage />, '/routes');
    expect(screen.getByTestId('all-routes-none')).toHaveTextContent('No bus runs a route yet.');
  });
});
