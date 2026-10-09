// How long a staff session may sit with nobody touching the screen, per role, before the portal signs out.
// Only the Operator portal is listed: it is an office screen. Driver and Chauffeur screens work with nobody touching
// them (the Driver's phone sends GPS, the Chauffeur's shift runs on), so a timer there would end tracking mid-trip.
// The server enforces the same idea for Operator tokens (backend config/sanctum.php idle_minutes); keep them in step.
export const STAFF_INACTIVITY_MINUTES = {
  operator: 30,
};
