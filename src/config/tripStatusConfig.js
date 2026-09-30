// Trip status display thresholds (Batch 24, A1). Kept in one place so no
// component carries its own number.

const num = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== '' && value != null ? parsed : fallback
}

export const TRIP_STATUS_CONFIG = {
  // A bus counts as "at a stop" for this long after the driver acknowledges it.
  atStopWindowSeconds: num(import.meta.env?.VITE_AT_STOP_WINDOW_S, 120),
}
