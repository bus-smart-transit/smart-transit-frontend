/** Batch 63: the whole-page skeleton that fits the address: the staff portals (/employee) get the portal shape. */
export const pageVariantForPath = (pathname = typeof window !== 'undefined' ? window.location.pathname : '') => (
  String(pathname).startsWith('/employee') ? 'portal' : 'page'
);
