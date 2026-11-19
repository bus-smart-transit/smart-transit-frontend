import { expect, request as playwrightRequest, test } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8000/api/';

// 2026-11-04: the mocked "Chauffeur must confirm ID" test was removed. The ID check is covered by
// useOnsiteQuote.test.js, OnsiteDiscountTest.php and the real discounted sale in batch44.e2e.js.

test('live Conductor API returns active onsite discount types', async () => {
  const api = await playwrightRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: 'application/json' } });

  try {
    const login = await api.post('auth/login', { data: { portal: 'staff', email: 'conductor@smarttransit.com', password: 'password123', role: 'conductor' } });
    expect(login.ok(), await login.text()).toBeTruthy();
    const loginData = (await login.json()).data;
    expect(loginData.otp_required).toBe(false);
    const token = loginData.token;
    const headers = { Authorization: `Bearer ${token}` };

    const initial = await api.get('conductor/discount-types', { headers });
    expect(initial.ok(), await initial.text()).toBeTruthy();
    expect((await initial.json()).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'student', label: 'Student', rate: 0.2 }),
      expect.objectContaining({ key: 'senior', label: 'Senior citizen', rate: 0.2 }),
      expect.objectContaining({ key: 'pwd', label: 'Person with disability', rate: 0.2 }),
    ]));
  } finally {
    await api.dispose();
  }
});