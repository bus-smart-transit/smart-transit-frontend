import { describe, expect, it } from 'vitest';
import { buildProfileView, NOT_PROVIDED, ROLE_LABELS } from '../accountProfile';

const staff = (over = {}) => ({ company_user_id: 7, name: 'Dina Driver', phone_num: '09000000003', address: 'Some street', birth_date: '1990-01-01', is_available: true, user: { email: 'd@example.test', role: 'driver', two_factor_enabled: false, created_at: '2026-10-10T03:12:52.000000Z' }, ...over });
const passenger = (over = {}) => ({ name: 'Pia Passenger', phone_num: '09100000001', address: 'Tagum City', reward_points: 12.5, passenger_uuid: '1a2b3c4d-1111-2222-3333-444455556666', two_factor_enabled: true, user: { email: 'p@example.test', created_at: '2026-10-09T00:00:00Z' }, ...over });

describe('buildProfileView', () => {
  it('labels the conductor role as Chauffeur and keeps the other names', () => {
    expect(ROLE_LABELS).toEqual({ passenger: 'Passenger', driver: 'Driver', conductor: 'Chauffeur', operator: 'Operator' });
    expect(buildProfileView('conductor', staff()).roleLabel).toBe('Chauffeur');
  });

  it('reads a passenger: reference, rewards, address and the two-factor state', () => {
    const view = buildProfileView('passenger', passenger());
    expect(view.identification).toEqual({ label: 'Passenger ID', value: '1A2B3C4D' });
    expect(view.rewardPoints).toBe('12.5 points');
    expect(view.address).toBe('Tagum City');
    expect(view.twoFactorEnabled).toBe(true);
    expect(view.lockedNote).toBeNull();
    expect(view.createdOn).toBeTruthy();
  });

  it('zero rewards is a real value; a missing balance is not invented', () => {
    expect(buildProfileView('passenger', passenger({ reward_points: 0 })).rewardPoints).toBe('0 points');
    expect(buildProfileView('passenger', passenger({ reward_points: undefined })).rewardPoints).toBeNull();
  });

  it('a staff member never gets an address or birth date, and gets the locked note for their role', () => {
    const driver = buildProfileView('driver', staff());
    expect(driver.address).toBeNull();
    expect(Object.values(driver)).not.toContain('1990-01-01');
    expect(driver.identification).toEqual({ label: 'Staff ID', value: '7' });
    expect(driver.lockedNote).toMatch(/contact your operator/);
    expect(driver.available).toBe(true);

    const operator = buildProfileView('operator', staff({ user: { email: 'o@example.test', two_factor_enabled: true } }));
    expect(operator.identification.label).toBe('Company ID');
    expect(operator.twoFactorRequired).toBe(true);
    expect(operator.lockedNote).toMatch(/administrator/);
    expect(operator.available).toBeNull();
  });

  it('missing values come back null so the page can say "Not provided"', () => {
    const view = buildProfileView('driver', { user: {} });
    expect(view.name).toBeNull();
    expect(view.email).toBeNull();
    expect(view.phone).toBeNull();
    expect(view.createdOn).toBeNull();
    expect(view.available).toBeNull();
    expect(NOT_PROVIDED).toBe('Not provided');
    expect(buildProfileView('driver', null).identification.value).toBeNull();
  });
});
