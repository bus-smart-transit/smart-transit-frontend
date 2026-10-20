import { expect, test } from '@playwright/test';

const route = {
  route_id: 4,
  route_name: 'Davao - Tagum',
  origin: 'Davao',
  destination: 'Tagum',
  allow_custom_dropoff: true,
  custom_dropoff_mode: 'free_pin',
  can_regenerate_geometry: false,
  geometry_stale: false,
  geometry_regeneration_pending: false,
  route_stops: [
    {
      id: 10,
      stop_id: 1,
      stop_order: 1,
      stop_type: 'terminal',
      distance_from_origin_km: 0,
      scheduled_offset_min: 0,
      stop: { stop_id: 1, stop_name: 'Davao City', municipality: 'Davao City', latitude: 7.1, longitude: 125.6 },
    },
    {
      id: 20,
      stop_id: 2,
      stop_order: 2,
      stop_type: 'stop',
      distance_from_origin_km: 20,
      scheduled_offset_min: 40,
      stop: { stop_id: 2, stop_name: 'Tagum City', municipality: 'Tagum City', latitude: 7.4, longitude: 125.8 },
    },
  ],
};

async function mockStaffApi(page, role, requests = []) {
  await page.addInitScript((staffRole) => {
    sessionStorage.setItem('staff_token', 'playwright-token');
    sessionStorage.setItem('staff_role', staffRole);
  }, role);

  await page.route(/^http:\/\/127\.0\.0\.1:8000\/api\//, async (requestRoute) => {
    const path = new URL(requestRoute.request().url()).pathname;
    requests.push(requestRoute.request().url());
    let data = [];

    if (path.endsWith(`/${role}/profile`)) {
      data = { name: `Playwright ${role}`, company_user_id: 1 };
    } else if (path.endsWith(`/${role}/routes`)) {
      data = [route];
    } else if (path.endsWith('/operator/fleets')) {
      data = [{ fleet_id: 3, plate_number: 'BUS-003', capacity: 40 }];
    } else if (path.includes('/reports/route-adherence')) {
      data = {
        period: { start_date: '2026-10-01', end_date: '2026-10-18' },
        summary: { total_trips: 2, trips_with_gps_data: 1, trips_with_proxy_data: 1, avg_stop_coverage_pct: 80, deviated_trips: 0, adherence_rate_pct: 100 },
        trips: [
          { trip_id: 17, trip_date: '2026-10-08', status: 'completed', stops_scheduled: 5, stops_visited: 5, stop_coverage_pct: 100, gps_points: 18, data_source: 'gps' },
          { trip_id: 18, trip_date: '2026-10-09', status: 'completed', stop_coverage_pct: 100, gps_points: 0, data_source: 'proxy' },
        ],
      };
    } else if (path.includes('/reports/occupancy-trends')) {
      data = { capacity: 40, occupancy: { average: 15, peak: 24, minimum: 6, average_utilization_percentage: 37.5, peak_utilization_percentage: 60 }, peak_hours: { 7: 10, 9: 20 }, trips_completed: 4 };
    } else if (path.includes('/reports/daily-summary')) {
      data = { date: '2026-10-12', summary: { total_trips: 8, completed_trips: 5, active_trips: 2, total_revenue: 12450, total_tickets: 36, average_occupancy: 7.2 } };
    }

    await requestRoute.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data }),
    });
  });
}

test('Operator route detail has stop schedule but no custom drop-off controls', async ({ page }) => {
  await mockStaffApi(page, 'operator');
  await page.goto('/employee/operator/dashboard?tab=routes');

  const openRoute = page.getByRole('button', { name: 'Open route Davao - Tagum' });
  await expect(openRoute).toBeVisible();
  await openRoute.click();

  const routeTabs = page.getByRole('tablist', { name: 'Route sections' });
  await expect(routeTabs.getByRole('tab', { name: 'Drop-off rules' })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /custom drop-off/i })).toHaveCount(0);

  await routeTabs.getByRole('tab', { name: 'Travel time' }).click();
  await expect(page.getByRole('table', { name: 'Scheduled travel time by stop' })).toBeVisible();
});

test('Admin route management has no drop-off rules or peak-hour factor controls', async ({ page }) => {
  await mockStaffApi(page, 'admin');
  await page.goto('/employee/admin/dashboard');

  await expect(page.getByRole('button', { name: 'Drop-off Rules' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Peak Hours' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Routes' }).click();
  await expect(page.getByRole('button', { name: 'Route details' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /custom drop-off/i })).toHaveCount(0);
});

test('Reports shows purpose-built adherence, occupancy, and daily views', async ({ page }) => {
  const requests = [];
  await mockStaffApi(page, 'operator', requests);
  await page.goto('/employee/operator/dashboard?tab=reports');

  await page.getByLabel('Fleet').selectOption('3');
  await page.getByRole('button', { name: 'Run report' }).click();
  await expect(page.getByRole('table', { name: 'Trip stop coverage' })).toBeVisible();
  await expect(page.getByText('Completion proxy')).toBeVisible();
  await expect(page.getByText('Not measured')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Historical Forecast' })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Occupancy Trends' }).click();
  await page.getByLabel('Fleet').selectOption('3');
  await page.getByLabel('From').fill('2026-10-01');
  await page.getByLabel('To').fill('2026-10-18');
  await page.getByRole('button', { name: 'Run report' }).click();
  await expect(page.getByRole('region', { name: 'Average occupancy by scheduled departure hour' })).toBeVisible();
  await expect(page.getByText('07:00')).toBeVisible();
  await expect(page.getByText('09:00')).toBeVisible();

  await page.getByRole('tab', { name: 'Daily Summary' }).click();
  await page.getByLabel('Fleet').selectOption('3');
  await page.getByLabel('Report date').fill('2026-10-12');
  await page.getByRole('button', { name: 'Run report' }).click();
  await expect(page.getByText('PHP 12,450.00')).toBeVisible();
  const dailyRequest = requests.find((url) => url.includes('/reports/daily-summary'));
  expect(new URL(dailyRequest).searchParams.get('date')).toBe('2026-10-12');
  expect(new URL(dailyRequest).searchParams.has('start_date')).toBe(false);
});