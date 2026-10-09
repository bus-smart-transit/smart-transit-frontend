import { describe, expect, test } from 'vitest';
import {
  LEGACY_TAB_REDIRECTS, OPERATOR_NAV, OPERATOR_VIEWS, buildLocationSearch, defaultView, navForRole, resolveOperatorLocation, viewsForRole,
} from '../operatorNav';

describe('Operator sidebar (Batch 30)', () => {
  test('is Dashboard, Staffs, Fleets, Routes, Schedule, Finance, Reports, Account', () => {
    expect(navForRole('operator').map((i) => i.label)).toEqual(['Dashboard', 'Staffs', 'Fleets', 'Routes', 'Schedule', 'Finance', 'Reports', 'Account']);
  });

  test('has no separate Trips, Calendar, Shift Blocks, Financials or Remittances item any more', () => {
    const keys = OPERATOR_NAV.map((i) => i.key);
    for (const old of ['trips', 'calendar', 'shiftBlocks', 'financials', 'remittances']) expect(keys).not.toContain(old);
  });

  test('Schedule has Calendar, Blocks, Trips; Finance has Overview, Transactions, Remittances, Refunds', () => {
    expect(viewsForRole('schedule', 'operator').map((v) => v.label)).toEqual(['Calendar', 'Blocks', 'Trips']);
    expect(viewsForRole('finance', 'operator').map((v) => v.label)).toEqual(['Overview', 'Transactions', 'Remittances', 'Refunds']);
  });

  test('Reports stays its own item: fleet reports and the forecast are not financial', () => {
    expect(navForRole('operator').some((i) => i.key === 'reports' && i.label === 'Reports')).toBe(true);
    expect(OPERATOR_VIEWS.finance.map((v) => v.key)).not.toContain('reports');
  });

  test('uses the same word as the Driver and Chauffeur sidebars for the same concept', () => {
    expect(navForRole('operator').find((i) => i.key === 'schedule').label).toBe('Schedule');
  });
});

describe('role visibility', () => {
  test('every other role sees no item and no view', () => {
    for (const role of ['driver', 'conductor', 'passenger', 'admin', undefined, '']) {
      expect(navForRole(role)).toEqual([]);
      expect(viewsForRole('schedule', role)).toEqual([]);
      expect(viewsForRole('finance', role)).toEqual([]);
      expect(defaultView('finance', role)).toBeNull();
    }
  });

  test('every item and view names the roles that may see it (nothing is visible by default)', () => {
    for (const item of OPERATOR_NAV) expect(item.roles.length).toBeGreaterThan(0);
    for (const views of Object.values(OPERATOR_VIEWS)) for (const v of views) expect(v.roles.length).toBeGreaterThan(0);
  });

  test('an item without views has none, and the default view is the first permitted one', () => {
    expect(viewsForRole('reports', 'operator')).toEqual([]);
    expect(defaultView('schedule', 'operator')).toBe('calendar');
    expect(defaultView('finance', 'operator')).toBe('overview');
    expect(defaultView('account', 'operator')).toBeNull();
  });
});

describe('old addresses redirect to the new places', () => {
  test.each([
    ['?tab=trips', { tab: 'schedule', view: 'trips', redirected: true }],
    ['?tab=calendar', { tab: 'schedule', view: 'calendar', redirected: true }],
    ['?tab=shiftBlocks', { tab: 'schedule', view: 'blocks', redirected: true }],
    ['?tab=financials', { tab: 'finance', view: 'overview', redirected: true }],
    ['?tab=remittances', { tab: 'finance', view: 'remittances', redirected: true }],
  ])('%s', (search, expected) => {
    expect(resolveOperatorLocation(search, 'operator')).toEqual(expected);
  });

  test('the old notification link (?tab=trips&trip=9) opens Schedule on Trips', () => {
    expect(resolveOperatorLocation('?tab=trips&trip=9', 'operator')).toMatchObject({ tab: 'schedule', view: 'trips' });
  });

  test('every old key has a target that exists for the Operator', () => {
    for (const target of Object.values(LEGACY_TAB_REDIRECTS)) {
      expect(navForRole('operator').some((i) => i.key === target.tab)).toBe(true);
      expect(viewsForRole(target.tab, 'operator').some((v) => v.key === target.view)).toBe(true);
    }
  });

  test('a new address opens as written, and a bad view falls back to the first view', () => {
    expect(resolveOperatorLocation('?tab=schedule&view=blocks', 'operator')).toEqual({ tab: 'schedule', view: 'blocks', redirected: false });
    expect(resolveOperatorLocation('?tab=finance&view=nope', 'operator')).toEqual({ tab: 'finance', view: 'overview', redirected: false });
    expect(resolveOperatorLocation('?tab=schedule', 'operator')).toEqual({ tab: 'schedule', view: 'calendar', redirected: false });
  });

  test('an unknown tab, no tab, or a tab the role cannot see opens the Dashboard', () => {
    expect(resolveOperatorLocation('?tab=bogus', 'operator').tab).toBe('dashboard');
    expect(resolveOperatorLocation('', 'operator').tab).toBe('dashboard');
    expect(resolveOperatorLocation('?tab=finance&view=overview', 'driver')).toEqual({ tab: 'dashboard', view: null, redirected: false });
    expect(resolveOperatorLocation('?tab=remittances', 'conductor')).toEqual({ tab: 'dashboard', view: null, redirected: false });
  });

  test('the rewritten address uses the new names and keeps the other parameters', () => {
    expect(buildLocationSearch('?tab=trips&trip=9', 'schedule', 'trips')).toBe('?tab=schedule&trip=9&view=trips');
    expect(buildLocationSearch('', 'finance', 'remittances')).toBe('?tab=finance&view=remittances');
    expect(buildLocationSearch('?tab=schedule&view=blocks', 'account', null)).toBe('?tab=account');
  });
});
