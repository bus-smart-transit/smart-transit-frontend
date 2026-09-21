import PassengerService from '../../PassengerService/PassengerService';

// Architecture audit follow-up (CONF-03): MapView.web.jsx previously called
// PassengerService directly with no hook/service-wrapper layer in between.
// Unlike ordinary dashboard data, MapView's fleet-marker animation state
// (fleetMarkersMapRef, fleetPrevRef/fleetNextRef, interpolation refs) is
// tightly bound to one MapLibre instance's lifecycle, not general app data —
// so (mirroring the FleetTrackingMap fix in useOperatorDashboard.js) these
// are thin wrapper functions, not a stateful hook. The map/marker/animation
// logic itself stays in the component.

export async function fetchRouteStopsForMap(routeId) {
  return await PassengerService.getRouteStops(routeId);
}

export async function fetchFleetLocationsForMap() {
  return await PassengerService.getFleetLocations();
}

export async function fetchNearestFleetForMap({ latitude, longitude }) {
  return await PassengerService.getNearestFleet({ latitude, longitude });
}
