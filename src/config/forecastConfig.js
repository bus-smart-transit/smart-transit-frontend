// Historical Forecast heuristics (Batch 24). Every weight, threshold and slot
// definition the forecast uses lives here and nowhere else. These are fixed
// heuristics, not measured or provider-backed traffic data: the UI and the SDD
// label them as such, and replacing them with data-driven values is listed as
// future work in SDD.md.

export const FORECAST_CONFIG = {
  heuristicNotice:
    'Heuristic estimate. Scores come from trip status, crew coverage and cancellations using fixed weights (config/forecastConfig.js). They are not measured or provider-backed traffic data.',

  // Points added to a route's risk score per occurrence.
  riskWeights: {
    cancelled: 28,
    boarding: 16,
    missingCrew: 18,
    emergencyAlert: 20,
    activeUnfinished: 12,
    // Multiplied by the percentage of trips not completed.
    incompletionPerPercent: 0.5,
  },

  // Route status from its risk score.
  routeStatusThresholds: { highRisk: 60, watch: 35 },

  // Added to the highest route risk to get the overall forecast risk.
  forecastRiskBoost: 10,

  // Risk for a slot = forecastRisk * multiplier + weight * slotWeightScale.
  slotWeightScale: 25,
  timeSlots: {
    morning: { weight: 0.28, multiplier: 1.1, window: '6:00 AM - 11:59 AM' },
    afternoon: { weight: 0.34, multiplier: 1.25, window: '12:00 PM - 5:59 PM' },
    evening: { weight: 0.38, multiplier: 1.35, window: '6:00 PM - 11:59 PM' },
  },

  // Slot note wording bands.
  slotNoteThresholds: { heavy: 70, moderate: 45 },

  // Recommendation priority from a route's risk score.
  priorityThresholds: { high: 70, medium: 45 },

  // Severity chip bands for a risk percentage.
  severityBands: { severe: 75, high: 50, moderate: 30 },
}
