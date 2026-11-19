// 2026-11-05: a one-time notice after a passenger deletes their account ({ deletesOn }) or keeps it by signing in again
// ({ cancelled: true }). Kept in sessionStorage, not in the router state, because a page that rewrites its own address on
// load (the home page's booking search) would drop router state before the notice is seen.
const KEY = 'account_deletion_notice';

export function leaveAccountDeletionNotice(notice) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(notice));
  } catch {
    // storage blocked: the passenger simply sees no notice
  }
}

/** Returns the notice once and removes it (null when there is none). */
export function takeAccountDeletionNotice() {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
