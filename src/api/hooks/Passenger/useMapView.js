import PassengerService from '../../PassengerService/PassengerService';

let fleetLocationsRequest = null;

// Architecture audit follow-up (CONF-03): MapView.web.jsx previously called
// PassengerService directly with no hook/service-wrapper layer in between.
// Unlike ordinary dashboard data, MapView's fleet-marker animation state
// (fleetMarkersMapRef, fleetPrevRef/fleetNextRef, interpolation refs) is
// tightly bound to one MapLibre instance's lifecycle, not general app data —
// so (mirroring the FleetTrackingMap fix in useOperatorDashboard.js) these
// are thin wrapper functions, not a stateful hook. The map/marker/animation
// logic itself stays in the component.

export async function fetchFleetLocationsForMap() {
  if (!fleetLocationsRequest) {
    fleetLocationsRequest = PassengerService.getFleetLocations()
      .finally(() => { fleetLocationsRequest = null; });
  }

  return await fleetLocationsRequest;
}

export async function fetchNearestFleetForMap({ latitude, longitude }) {
  return await PassengerService.getNearestFleet({ latitude, longitude });
}
