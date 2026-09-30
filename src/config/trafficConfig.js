// Traffic labelling (Batch 24 close-out). Nothing here is a typed-in delay: congestion is the
// extra time the provider reports for the same trip compared with that provider's own
// free-flow (no-traffic) time. A provider with no traffic data, or a failed baseline request,
// yields level "unknown" and no delay figure, never a guess. These ratios are the only
// thresholds, kept in one place.

export const TRAFFIC_CONFIG = {
  // Extra time as a share of the free-flow time.
  delayRatio: { moderate: 0.25, heavy: 0.6 },
  // Smaller differences are noise and read as normal flow.
  minDelayMinutes: 1,
}
