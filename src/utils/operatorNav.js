// Batch 30: the Operator sidebar and the views inside its pages, as data. The Operator portal is one page whose
// sidebar item (`?tab=`) and view (`?view=`) are kept in the address, so a link, a refresh and the back button land
// on the same screen.
//
//  - Schedule  = Calendar, Blocks, Trips (was three sidebar items).
//  - Finance   = Overview, Transactions, Remittances, Refunds (was Financials and Remittances).
//  - Reports   stays its own item: it holds fleet reports and the historical forecast, which are not financial.
//
// Each item and view lists the roles that may see it, so nothing is visible by default. Today only the Operator
// portal uses this; the Driver, Chauffeur and Admin navigation are separate and unchanged.

export const OPERATOR_ROLE = 'operator';

const OPERATOR_ONLY = [OPERATOR_ROLE];

export const OPERATOR_NAV = [
  { key: 'dashboard', label: 'Dashboard', roles: OPERATOR_ONLY },
  { key: 'staffs', label: 'Staffs', roles: OPERATOR_ONLY },
  { key: 'fleets', label: 'Fleets', roles: OPERATOR_ONLY },
  { key: 'routes', label: 'Routes', roles: OPERATOR_ONLY },
  { key: 'schedule', label: 'Schedule', roles: OPERATOR_ONLY },
  { key: 'finance', label: 'Finance', roles: OPERATOR_ONLY },
  { key: 'reports', label: 'Reports', roles: OPERATOR_ONLY },
  { key: 'account', label: 'Account', roles: OPERATOR_ONLY },
];

export const OPERATOR_VIEWS = {
  schedule: [
    { key: 'calendar', label: 'Calendar', roles: OPERATOR_ONLY },
    { key: 'blocks', label: 'Blocks', roles: OPERATOR_ONLY },
    { key: 'trips', label: 'Trips', roles: OPERATOR_ONLY },
  ],
  finance: [
    { key: 'overview', label: 'Overview', roles: OPERATOR_ONLY },
    { key: 'transactions', label: 'Transactions', roles: OPERATOR_ONLY },
    { key: 'remittances', label: 'Remittances', roles: OPERATOR_ONLY },
    { key: 'refunds', label: 'Refunds', roles: OPERATOR_ONLY },
  ],
};

/** The sidebar items the role may see, in order. */
export const navForRole = (role) => OPERATOR_NAV.filter((item) => item.roles.includes(role));

/** The views of one item the role may see (empty for an item without views, or one the role cannot see). */
export function viewsForRole(tab, role) {
  if (!navForRole(role).some((item) => item.key === tab)) return [];
  return (OPERATOR_VIEWS[tab] || []).filter((view) => view.roles.includes(role));
}

/** The view an item opens on: its first permitted view, or null when it has none. */
export const defaultView = (tab, role) => viewsForRole(tab, role)[0]?.key ?? null;

/**
 * The old sidebar items and where they live now. Links made before Batch 30 (a notification's `?tab=trips&trip=9`, a
 * bookmark) keep working: they are read as the new location and the address is rewritten to it.
 */
export const LEGACY_TAB_REDIRECTS = {
  trips: { tab: 'schedule', view: 'trips' },
  calendar: { tab: 'schedule', view: 'calendar' },
  shiftBlocks: { tab: 'schedule', view: 'blocks' },
  financials: { tab: 'finance', view: 'overview' },
  remittances: { tab: 'finance', view: 'remittances' },
};

/**
 * Where the page opens for an address (`location.search`): { tab, view, redirected }. An unknown tab, a tab the role
 * cannot see, or a view the role cannot see falls back to the Dashboard / the item's first view.
 */
export function resolveOperatorLocation(search, role = OPERATOR_ROLE) {
  let params;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    params = new URLSearchParams('');
  }
  const asked = params.get('tab');
  const askedView = params.get('view');

  const legacy = LEGACY_TAB_REDIRECTS[asked];
  const tab = legacy ? legacy.tab : asked;
  if (!navForRole(role).some((item) => item.key === tab)) return { tab: 'dashboard', view: null, redirected: false };

  const wanted = legacy ? legacy.view : askedView;
  const views = viewsForRole(tab, role);
  const view = views.some((v) => v.key === wanted) ? wanted : defaultView(tab, role);
  return { tab, view, redirected: Boolean(legacy) };
}

/** The address search for a tab and view, keeping any other parameter (trip, block) that was there. */
export function buildLocationSearch(currentSearch, tab, view) {
  let params;
  try {
    params = new URLSearchParams(currentSearch || '');
  } catch {
    params = new URLSearchParams('');
  }
  params.set('tab', tab);
  if (view) params.set('view', view);
  else params.delete('view');
  return `?${params.toString()}`;
}
