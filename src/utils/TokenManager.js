/**
 * TokenManager — single source of truth for token storage.
 *
 * Staff tokens live in sessionStorage ONLY (cleared on browser/tab close).
 * Passenger tokens honour the "remember me" flag: sessionStorage by default,
 * localStorage when the user opts in to persistent login.
 */

const STAFF_TOKEN_KEY = 'staff_token';
const STAFF_ROLE_KEY  = 'staff_role';
const PASS_TOKEN_KEY  = 'passenger_token';

export const TokenManager = {
  // ── Staff ───────────────────────────────────────────────────────────────
  getStaffToken() {
    return sessionStorage.getItem(STAFF_TOKEN_KEY) ?? null;
  },

  getStaffRole() {
    return sessionStorage.getItem(STAFF_ROLE_KEY) ?? null;
  },

  setStaffSession(token, role) {
    // Remove any stale localStorage remnant from previous versions.
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STAFF_ROLE_KEY);
    sessionStorage.setItem(STAFF_TOKEN_KEY, token);
    sessionStorage.setItem(STAFF_ROLE_KEY, role);
  },

  clearStaffSession() {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STAFF_ROLE_KEY);
    sessionStorage.removeItem(STAFF_TOKEN_KEY);
    sessionStorage.removeItem(STAFF_ROLE_KEY);
  },

  // ── Passenger ───────────────────────────────────────────────────────────
  getPassengerToken() {
    return sessionStorage.getItem(PASS_TOKEN_KEY) ?? localStorage.getItem(PASS_TOKEN_KEY) ?? null;
  },

  setPassengerToken(token, remember = false) {
    sessionStorage.setItem(PASS_TOKEN_KEY, token);
    if (remember) {
      localStorage.setItem(PASS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(PASS_TOKEN_KEY);
    }
  },

  clearPassengerToken() {
    sessionStorage.removeItem(PASS_TOKEN_KEY);
    localStorage.removeItem(PASS_TOKEN_KEY);
  },
};
