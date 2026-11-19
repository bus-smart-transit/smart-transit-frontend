// Batch 46 (decided 2026-11-05): who the Operator may pick for a trip or shift block. A crew member who set Not
// Available on their profile is shown but cannot be chosen (the server refuses it too). Deactivated people never
// reach the list (the server leaves them out).

const nameOf = (person) => person?.name || person?.user?.name || person?.user?.username || person?.username || 'Not provided';
const usernameOf = (person) => person?.user?.username || person?.username || '';

// Batch 51 item 6 (2026-11-09): a driver already on a trip that day comes with the server's reason (busy_reason) and
// is shown but cannot be chosen (one trip per person per day).
export const isPickable = (person) => Boolean(person?.is_available) && !person?.busy_reason;

/** "Juan Dela Cruz (@juan)", with " - Not Available" or " - {busy reason}" for someone who cannot be picked now. */
export function crewOptionLabel(person) {
  const username = usernameOf(person);
  const base = username ? `${nameOf(person)} (@${username})` : nameOf(person);
  if (person?.busy_reason) return `${base} - ${person.busy_reason}`;
  return isPickable(person) ? base : `${base} - Not Available`;
}

/** Pickable people first, then the Not Available ones, each by name. */
export function sortForPicker(people = []) {
  return [...people].sort((a, b) => {
    if (isPickable(a) !== isPickable(b)) return isPickable(a) ? -1 : 1;
    return nameOf(a).localeCompare(nameOf(b));
  });
}

/** A trip still waiting for its Driver or Chauffeur (it cannot start boarding yet). */
export const needsCrew = (trip) => !trip?.driver_id || !trip?.conductor_id;
