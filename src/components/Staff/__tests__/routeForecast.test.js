import { describe, expect, it } from 'vitest'
import { buildOperatorForecast } from '../routeForecast'

describe('buildOperatorForecast', () => {
  it('summarizes route performance and produces a forecast risk score', () => {
    const trips = [
      { trip_id: 1, status: 'completed', total_revenue: 800, trip_date: '2026-09-01', fleet_route: { route: { route_name: 'Route A' } } },
      { trip_id: 2, status: 'completed', total_revenue: 950, trip_date: '2026-09-01', fleet_route: { route: { route_name: 'Route A' } } },
      { trip_id: 3, status: 'boarding', total_revenue: 640, trip_date: '2026-09-02', fleet_route: { route: { route_name: 'Route B' } } },
      { trip_id: 4, status: 'departed', total_revenue: 700, trip_date: '2026-09-02', fleet_route: { route: { route_name: 'Route B' } } },
      { trip_id: 5, status: 'cancelled', total_revenue: 0, trip_date: '2026-09-03', fleet_route: { route: { route_name: 'Route C' } } },
    ]

    const result = buildOperatorForecast(trips)

    expect(result.totalTrips).toBe(5)
    expect(result.avgRevenue).toBeGreaterThan(0)
    expect(result.routePerformance.length).toBeGreaterThan(0)
    expect(result.forecastRisk).toBeGreaterThanOrEqual(0)
    expect(result.forecastRisk).toBeLessThanOrEqual(100)
    expect(result.timeSlotForecast).toBeTruthy()
    expect(Object.keys(result.timeSlotForecast)).toEqual(expect.arrayContaining(['morning', 'afternoon', 'evening']))
    expect(result.rerouteRecommendations).toBeTruthy()
    expect(result.rerouteRecommendations.length).toBeGreaterThan(0)
    expect(result.rerouteRecommendations[0]).toMatchObject({
      route: expect.any(String),
      priority: expect.any(String),
      alternativeRoute: expect.any(String),
      crewState: expect.any(String),
      emergencyState: expect.any(String),
      recommendedAction: expect.any(String),
      dispatchAction: expect.any(String),
    })
    expect(result.routeComparison).toBeTruthy()
    expect(result.routeComparison.length).toBeGreaterThan(0)
    expect(result.routeComparison[0]).toMatchObject({
      route: expect.any(String),
      trafficLevel: expect.any(String),
      currentEtaMinutes: expect.any(Number),
      alternativeRoute: expect.any(String),
      timeSavedMinutes: expect.any(Number),
      recommendation: expect.any(String),
      dispatchAction: expect.any(String),
    })
  })
})
