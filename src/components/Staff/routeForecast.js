import { FORECAST_CONFIG } from '../../config/forecastConfig'

export function buildOperatorForecast(trips = []) {
  const routes = new Map()
  const { riskWeights, routeStatusThresholds, forecastRiskBoost, slotWeightScale, slotNoteThresholds, priorityThresholds } = FORECAST_CONFIG
  const timeSlots = FORECAST_CONFIG.timeSlots

  for (const trip of trips) {
    const routeName = trip?.fleet_route?.route?.route_name || 'Unassigned Route'
    const entry = routes.get(routeName) ?? {
      route: routeName,
      trips: 0,
      revenue: 0,
      active: 0,
      cancelled: 0,
      completed: 0,
      boarding: 0,
      crewAssigned: 0,
      missingCrew: 0,
      emergencyAlerts: 0,
    }

    entry.trips += 1
    entry.revenue += Number(trip?.total_revenue ?? 0)
    if (['departed', 'in-progress', 'boarding'].includes(trip?.status)) entry.active += 1
    if (trip?.status === 'completed') entry.completed += 1
    if (trip?.status === 'boarding') entry.boarding += 1
    if (trip?.status === 'cancelled') entry.cancelled += 1
    if (trip?.driver && trip?.conductor) entry.crewAssigned += 1
    if (!trip?.driver || !trip?.conductor) entry.missingCrew += 1
    if (trip?.is_emergency || trip?.status === 'cancelled' || trip?.has_alert) entry.emergencyAlerts += 1

    routes.set(routeName, entry)
  }

  const routePerformance = [...routes.values()].map(row => {
    const completionRate = row.trips > 0 ? (row.completed / row.trips) * 100 : 0
    const riskScore = Math.min(100, Math.round(
      (row.cancelled * riskWeights.cancelled) +
      (row.boarding * riskWeights.boarding) +
      (row.missingCrew * riskWeights.missingCrew) +
      (row.emergencyAlerts * riskWeights.emergencyAlert) +
      (Math.max(0, row.active - row.completed) * riskWeights.activeUnfinished) +
      (100 - completionRate) * riskWeights.incompletionPerPercent
    ))

    return {
      route: row.route,
      trips: row.trips,
      revenue: row.revenue,
      completionRate,
      riskScore,
      crewAssigned: row.crewAssigned,
      missingCrew: row.missingCrew,
      emergencyAlerts: row.emergencyAlerts,
      status: riskScore >= routeStatusThresholds.highRisk ? 'High risk' : riskScore >= routeStatusThresholds.watch ? 'Watch' : 'Stable',
    }
  }).sort((a, b) => b.riskScore - a.riskScore)

  const totalTrips = trips.length
  const avgRevenue = totalTrips > 0 ? trips.reduce((sum, trip) => sum + Number(trip?.total_revenue ?? 0), 0) / totalTrips : 0
  const highestRisk = routePerformance[0] ?? null
  const forecastRisk = highestRisk ? Math.min(100, highestRisk.riskScore + forecastRiskBoost) : 0

  const timeSlotForecast = Object.fromEntries(
    Object.entries(timeSlots).map(([slot, config]) => {
      const risk = Math.min(100, Math.round((forecastRisk * config.multiplier) + (config.weight * slotWeightScale)))
      return [slot, {
        label: slot.charAt(0).toUpperCase() + slot.slice(1),
        risk,
        note: risk >= slotNoteThresholds.heavy
          ? 'Heavy operational pressure expected.'
          : risk >= slotNoteThresholds.moderate
            ? 'Moderate operational pressure expected.'
            : 'Low operational pressure expected.',
      }]
    })
  )

  const rerouteRecommendations = routePerformance.length > 0
    ? routePerformance.slice(0, 3).map(row => {
        const priority = row.riskScore >= priorityThresholds.high ? 'high' : row.riskScore >= priorityThresholds.medium ? 'medium' : 'low'
        const peakSlot = Object.entries(timeSlotForecast).sort((a, b) => b[1].risk - a[1].risk)[0][0]
        const crewState = row.missingCrew > 0 ? 'Crew assignment gap' : 'Crew ready'
        const emergencyState = row.emergencyAlerts > 0 ? 'Emergency or incident alert active' : 'Normal service monitoring'

        let recommendedAction = `Continue ${row.route} and monitor live telemetry for delays.`
        let dispatchAction = `Keep ${row.route} on the assigned path and continue monitoring.`
        if (priority === 'high') {
          recommendedAction = `High risk detected on ${row.route}. Verify live traffic provider data and coordinate dispatch review before any reroute decision.`
          dispatchAction = `Escalate ${row.route} for dispatcher review and monitor live traffic signals.`
        } else if (priority === 'medium') {
          recommendedAction = `Moderate risk on ${row.route}. Keep schedule buffers and monitor driver updates during the ${peakSlot} period.`
          dispatchAction = `Issue monitoring advisory for ${row.route} and re-evaluate if risk increases.`
        }

        return {
          route: row.route,
          priority,
          riskScore: row.riskScore,
          alternativeRoute: null,
          crewState,
          emergencyState,
          recommendedAction,
          dispatchAction,
          reason: row.status === 'High risk'
            ? 'High risk is driven by trip cancellations, incomplete crew coverage, and active operational alerts.'
            : 'Route pressure is elevated, so dispatch should monitor and decide using live traffic telemetry.',
          peakSlot,
        }
      })
    : []

  const routeComparison = routePerformance.length > 0
    ? routePerformance.slice(0, 3).map(row => ({
        route: row.route,
        trafficLevel: row.riskScore >= priorityThresholds.high ? 'High operational risk' : row.riskScore >= priorityThresholds.medium ? 'Moderate operational risk' : 'Stable',
        currentEtaMinutes: null,
        alternativeRoute: null,
        alternateEtaMinutes: null,
        timeSavedMinutes: null,
        recommendation: 'ETA comparison is unavailable without provider-backed live traffic geometry.',
        dispatchAction: 'Use live traffic provider data before issuing reroute instructions.',
      }))
    : []

  return {
    totalTrips,
    avgRevenue,
    routePerformance,
    highestRisk,
    forecastRisk,
    timeSlotForecast,
    rerouteRecommendations,
    routeComparison,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * B6: narrow the trips a forecast is built from. Dates are business-day
 * 'YYYY-MM-DD' strings compared as text (no timezone conversion); empty
 * filters mean "all".
 */
export function filterForecastTrips(trips = [], { from = '', to = '', routeId = '', fleetId = '' } = {}) {
  return trips.filter((trip) => {
    const date = String(trip?.trip_date || '').slice(0, 10)
    if (from && date < from) return false
    if (to && date > to) return false
    if (routeId && String(trip?.fleet_route?.route_id ?? '') !== String(routeId)) return false
    if (fleetId && String(trip?.fleet_route?.fleet_id ?? '') !== String(fleetId)) return false
    return true
  })
}