import { expect, request as playwrightRequest, test } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/';

const trip = {
  trip_id: 51,
  status: 'boarding',
  trip_date: '2026-10-18',
  departure_time: '08:00:00',
  service_type: 'regular',
  current_seated_capacity: 0,
  current_standing_capacity: 0,
  total_occupancy: 0,
  fleet_route: {
    fleet_route_id: 5,
    route_id: 4,
    fleet_id: 3,
    start_time: '06:00',
    route: {
      route_id: 4,
      route_name: 'Davao - Tagum',
      origin: 'Davao',
      destination: 'Tagum',
      route_stops: [
        { stop_id: 1, stop_order: 1, stop_type: 'terminal', distance_from_origin_km: 0, stop: { stop_id: 1, stop_name: 'Davao Terminal' } },
        { stop_id: 2, stop_order: 2, stop_type: 'terminal', distance_from_origin_km: 20, stop: { stop_id: 2, stop_name: 'Tagum Terminal' } },
      ],
    },
    fleet: { fleet_id: 3, plate_number: 'PW-003', capacity: 40, seated_capacity: 30, standing_capacity: 10, vehicle_class: 'ordinary' },
  },
};

test('Chauffeur must confirm ID before sending an onsite discount to checkout', async ({ page }) => {
  let checkoutPayload = null;
  await page.addInitScript(() => {
    sessionStorage.setItem('staff_token', 'playwright-conductor-token');
    sessionStorage.setItem('staff_role', 'conductor');
  });

  await page.route(/^http:\/\/127\.0\.0\.1:8000\/api\/conductor\//, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data = [];

    if (path.endsWith('/conductor/profile')) {
      data = { name: 'Playwright Chauffeur', is_available: true, user: { name: 'Playwright Chauffeur', role: 'conductor' } };
    } else if (path.endsWith('/conductor/pairing-status')) {
      data = { paired: true };
    } else if (path.endsWith('/conductor/trips/current')) {
      data = trip;
    } else if (path.endsWith('/conductor/trips')) {
      data = [trip];
    } else if (path.endsWith('/conductor/shift/status')) {
      data = { has_open_shift: true, open_shift: { trip_id: trip.trip_id }, shift_cash: { opening_cash: 0, expected_cash: 0 } };
    } else if (path.endsWith('/conductor/shift-blocks')) {
      data = [];
    } else if (path.endsWith('/conductor/discount-types')) {
      data = [
        { key: 'student', label: 'Student', rate: 0.2 },
        { key: 'senior_citizen', label: 'Senior citizen', rate: 0.2 },
        { key: 'pwd', label: 'Person with disability (PWD)', rate: 0.2 },
      ];
    } else if (path.endsWith('/conductor/trips/current/occupancy')) {
      data = {
        boarded: { seated: 0, standing: 0 },
        capacity: { total: 40, seated: 30, standing: 10 },
        capacity_summary: { capacity: { total: 40 }, sold: { total: 0 }, onboard: { total: 0 }, remaining: { total: 40 }, is_full: false },
      };
    } else if (path.endsWith('/conductor/trips/current/passengers')) {
      data = [];
    } else if (path.endsWith('/conductor/trips/current/earnings')) {
      data = { total_fare: 0, passenger_count: 0, net_total: 0 };
    } else if (path.endsWith('/conductor/notifications')) {
      data = [];
    } else if (path.endsWith('/conductor/checkout') && request.method() === 'POST') {
      checkoutPayload = request.postDataJSON();
      data = {
        payment: { payment_id: 91, amount: 28, transaction_reference: 'PW-CASH-91' },
        tickets: [{
          ticket_id: 91, ticket_uuid: 'pw-ticket-91', amount: 28, original_amount: 35,
          discount_type_key: 'student', discount_label: 'Student', discount_rate: 0.2, discount_amount: 7,
          discount_id_checked_at: '2026-10-18T08:00:00Z',
        }],
        issued_at: '2026-10-18T08:00:00Z',
        issued_by: { name: 'Playwright Chauffeur' },
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', message: 'OK', data }),
    });
  });

  await page.goto('/employee/conductor/dashboard?tab=occupancy');
  await expect(page.getByRole('heading', { name: 'Manual Cash Ticket' })).toBeVisible();
  await page.getByLabel('Boarding stop').selectOption('1');
  await page.getByLabel('Select Destination').selectOption('2');
  await page.getByLabel('Onsite discount').selectOption('student');

  const generate = page.getByRole('button', { name: 'Generate Ticket' });
  await expect(generate).toBeDisabled();
  await page.getByLabel(/I checked the passenger's valid ID/).check();
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByRole('dialog', { name: 'Record cash payment' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Payment' }).click();

  await expect.poll(() => checkoutPayload).toMatchObject({
    items: [{ trip_id: 51, discount_type_key: 'student', discount_id_checked: true }],
  });
  await expect(page.getByText('Onsite checkout recorded successfully.')).toBeVisible();
  await expect(page.getByText('PW-CASH-91')).toBeVisible();
});

test('live Conductor API returns active onsite discount types', async () => {
  const api = await playwrightRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });

  try {
    const login = await api.post('staff/login', { data: { email: 'conductor@smarttransit.com', password: 'password123', role: 'conductor' } });
    expect(login.ok(), await login.text()).toBeTruthy();
    const loginData = (await login.json()).data;
    expect(loginData.otp_required).toBe(false);
    const token = loginData.token;
    const headers = { Authorization: `Bearer ${token}` };

    const initial = await api.get('conductor/discount-types', { headers });
    expect(initial.ok(), await initial.text()).toBeTruthy();
    expect((await initial.json()).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'student', label: 'Student', rate: 0.2 }),
      expect.objectContaining({ key: 'senior_citizen', label: 'Senior citizen', rate: 0.2 }),
      expect.objectContaining({ key: 'pwd', label: 'Person with disability (PWD)', rate: 0.2 }),
    ]));
  } finally {
    await api.dispose();
  }
});