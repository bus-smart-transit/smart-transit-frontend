const buildAlternativeRouteName = (routeName = '') => {
  const normalized = String(routeName).toLowerCase()

  if (normalized.includes('downtown')) return `${routeName} via North Bypass`
  if (normalized.includes('central')) return `${routeName} via East Relief Corridor`
  if (normalized.includes('toril') || normalized.includes('sasa') || normalized.includes('matina')) return `${routeName} via South Relief Corridor`
  if (normalized.includes('agdao') || normalized.includes('ma-a')) return `${routeName} via Parallel Bypass Route`

  return `${routeName} via Parallel Bypass Route`
}

export function buildOperatorForecast(trips = []) {
  const routes = new Map()
  const timeSlots = {
    morning: { weight: 0.28, multiplier: 1.1 },
    afternoon: { weight: 0.34, multiplier: 1.25 },
    evening: { weight: 0.38, multiplier: 1.35 },
  }

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
      (row.cancelled * 28) +
      (row.boarding * 16) +
      (row.missingCrew * 18) +
      (row.emergencyAlerts * 20) +
      (Math.max(0, row.active - row.completed) * 12) +
      (100 - completionRate) * 0.5
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
      status: riskScore >= 60 ? 'High risk' : riskScore >= 35 ? 'Watch' : 'Stable',
    }
  }).sort((a, b) => b.riskScore - a.riskScore)

  const totalTrips = trips.length
  const avgRevenue = totalTrips > 0 ? trips.reduce((sum, trip) => sum + Number(trip?.total_revenue ?? 0), 0) / totalTrips : 0
  const highestRisk = routePerformance[0] ?? null
  const forecastRisk = highestRisk ? Math.min(100, highestRisk.riskScore + 10) : 0

  const timeSlotForecast = Object.fromEntries(
    Object.entries(timeSlots).map(([slot, config]) => {
      const risk = Math.min(100, Math.round((forecastRisk * config.multiplier) + (config.weight * 25)))
      return [slot, {
        label: slot.charAt(0).toUpperCase() + slot.slice(1),
        risk,
        note: risk >= 70 ? 'Heavy pressure expected' : risk >= 45 ? 'Moderate delays likely' : 'Low disruption expected',
      }]
    })
  )

  const rerouteRecommendations = routePerformance.length > 0
    ? routePerformance.slice(0, 3).map(row => {
        const priority = row.riskScore >= 70 ? 'high' : row.riskScore >= 45 ? 'medium' : 'low'
        const peakSlot = Object.entries(timeSlotForecast).sort((a, b) => b[1].risk - a[1].risk)[0][0]
        const crewState = row.missingCrew > 0 ? 'Crew assignment gap' : 'Crew ready'
        const emergencyState = row.emergencyAlerts > 0 ? 'Emergency or incident alert active' : 'Normal service monitoring'
        const alternativeRoute = buildAlternativeRouteName(row.route)

        let recommendedAction = `Keep ${row.route} on its current schedule and monitor traffic.`
        let dispatchAction = `Keep ${row.route} on the assigned path and continue monitoring.`
        if (priority === 'high') {
          recommendedAction = `Reroute ${row.route} through ${alternativeRoute} and assign relief staff before the next ${peakSlot} window.`
          dispatchAction = `Dispatch ${row.route} via ${alternativeRoute} and notify the driver.`
        } else if (priority === 'medium') {
          recommendedAction = `Shift ${row.route} to ${alternativeRoute} with a longer buffer and dispatch updates in the ${peakSlot} period.`
          dispatchAction = `Send reroute notice for ${row.route} through ${alternativeRoute}.`
        }

        return {
          route: row.route,
          priority,
          riskScore: row.riskScore,
          alternativeRoute,
          crewState,
          emergencyState,
          recommendedAction,
          dispatchAction,
          reason: row.status === 'High risk'
            ? 'Delay risk is high because traffic pressure, crew coverage, and incident conditions are all trending negative.'
            : 'The route is under moderate stress and would benefit from a lower-risk alternate corridor during the next peak period.',
          peakSlot,
        }
      })
    : []

  const routeComparison = routePerformance.length > 0
    ? routePerformance.slice(0, 3).map(row => {
        const trafficLevel = row.riskScore >= 70 ? 'Heavy congestion' : row.riskScore >= 45 ? 'Moderate congestion' : 'Stable'
        const currentEtaMinutes = Math.max(6, Math.round(row.riskScore / 7))
        const altEtaMinutes = Math.max(4, Math.round(currentEtaMinutes * (row.riskScore >= 70 ? 0.62 : row.riskScore >= 45 ? 0.78 : 0.92)))
        const deltaMinutes = Math.max(2, currentEtaMinutes - altEtaMinutes)
        const alternative = buildAlternativeRouteName(row.route)
        const recommendation = row.riskScore >= 70
          ? `Current route is slower by ${deltaMinutes} minutes. Reassign this trip to ${alternative} to reduce delays.`
          : row.riskScore >= 45
            ? `Current route is mildly congested. Consider ${alternative} to save about ${deltaMinutes} minutes.`
            : `${row.route} is stable; keep the assigned route and monitor traffic only.`

        return {
          route: row.route,
          trafficLevel,
          currentEtaMinutes,
          alternativeRoute: alternative,
          alternateEtaMinutes: altEtaMinutes,
          timeSavedMinutes: deltaMinutes,
          recommendation,
          dispatchAction: row.riskScore >= 70
            ? `Approve reroute to ${alternative}`
            : row.riskScore >= 45
              ? `Inform driver about ${alternative}`
              : 'Keep current route and continue monitoring',
        }
      })
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
