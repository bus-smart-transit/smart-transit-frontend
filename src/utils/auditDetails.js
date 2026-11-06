/** Batch 48 Phase 4: an audit entry's recorded details as short "key: value" lines (they never hold passwords). */
export function detailText(details) {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join(' · ');
}
