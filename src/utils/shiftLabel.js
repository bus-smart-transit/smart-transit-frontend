/**
 * 2026-10-27: a shift block is shown as the crew's shift: "Morning shift" or "Afternoon shift" (the stored block type).
 * It starts with its first trip and finishes with its last; there is no takeover or hand-off button.
 */
export function shiftLabel(blockType) {
  const type = String(blockType || '').trim().toLowerCase();
  if (!type) return 'Shift';
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} shift`;
}
