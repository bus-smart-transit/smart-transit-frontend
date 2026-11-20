import api from './api.js'

// 2026-11-20 (user): the passengers' route pages (a province picture -> its routes -> one route). Read only, no
// account; every value comes from the server (PublicRouteService, RouteService::getPublicStopsForRoute).

const data = (response) => response?.data?.data ?? null

export async function getProvinceRoutes(province) {
  return data(await api.get('/routes', { params: { province } }))
}

export async function getPublicRoute(routeId) {
  return data(await api.get(`/routes/${encodeURIComponent(routeId)}`))
}

export async function getPublicRouteStops(routeId, direction = 'outbound') {
  return data(await api.get(`/routes/${encodeURIComponent(routeId)}/stops`, { params: { direction } }))
}

export async function getRouteDepartures(routeId) {
  return data(await api.get(`/routes/${encodeURIComponent(routeId)}/departures`))
}
