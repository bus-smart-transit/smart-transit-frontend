import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
      { route_id: 8, route_name: 'Sample City to East Town', origin: 'Sample City Terminal', destination: 'East Town Terminal', company_name: 'Sample Lines' },
    ], groups: [
      { key: 'sample city|east town', title: 'Sample City Terminal → East Town Terminal', routes: [{ route_id: 8, route_name: 'Sample City to East Town', company_name: 'Sample Lines' }] },
    ] } });
    at('/provinces/sample-oriental', <ProvinceRoutesPage />, '/provinces/:slug');

    expect(useProvinceRoutes).toHaveBeenLastCalledWith('Sample Oriental');
    expect(screen.getByRole('heading', { name: 'Sample Oriental' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sample City Terminal → East Town Terminal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sample Lines/ })).toHaveAttribute('href', '/routes/8');
    expect(screen.getByTestId('route-card-company')).toHaveTextContent('Sample Lines');
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
      route: { route_id: 8, route_name: 'Sample City to East Town', origin: 'Sample City Terminal', destination: 'East Town Terminal', provinces: ['Sample Oriental'], company_name: null },
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
  // 2026-11-21 (user): one card per pair of ends, listing the companies that run it; each company opens its own route.
  it('shows one card per pair of ends with each company opening its own route', () => {
    useAllRoutes.mockReturnValue({ loading: false, error: '', data: { groups: [
      { key: 'a|b', title: 'Sample Terminal → East Terminal', routes: [
        { route_id: 9, route_name: 'Sample to East (Alpha)', company_name: 'Alpha Bus' },
        { route_id: 8, route_name: 'Sample to East', company_name: 'Sample Lines' },
      ] },
      { key: 'a|c', title: 'Sample Terminal → North Terminal', routes: [{ route_id: 10, route_name: 'Sample to North', company_name: null }] },
    ] } });
    at('/routes', <AllRoutesPage />, '/routes');

    const cards = screen.getAllByTestId('route-card');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole('heading', { name: 'Sample Terminal → East Terminal' })).toBeInTheDocument();
    expect(within(cards[0]).getByText('Companies')).toBeInTheDocument();
    expect(within(cards[0]).getAllByTestId('route-card-company').map((el) => [el.textContent, el.getAttribute('href')]))
      .toEqual([['Alpha Bus', '/routes/9'], ['Sample Lines', '/routes/8']]);
    expect(within(cards[1]).getByTestId('route-card-company')).toHaveTextContent('Not provided');
    expect(within(cards[1]).getByText('Company')).toBeInTheDocument();
  });

  it('says plainly when there is no route yet', () => {
    useAllRoutes.mockReturnValue({ loading: false, error: '', data: { routes: [], groups: [] } });
    at('/routes', <AllRoutesPage />, '/routes');
    expect(screen.getByTestId('all-routes-none')).toHaveTextContent('No routes yet.');
  });
});
