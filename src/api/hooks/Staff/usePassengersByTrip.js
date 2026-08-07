import { useMemo } from 'react';

const resolveDestination = (passenger) => {
  // Named stop (stop-based ticket)
  const stopName =
    (typeof passenger.destination_stop === 'string' && passenger.destination_stop) ||
    passenger.destination_stop?.stop_name ||
    (typeof passenger.destinationStop === 'string' && passenger.destinationStop) ||
    passenger.destinationStop?.stop_name ||
    passenger.destination;
  if (stopName) return stopName;

  // Custom GPS pinpoint ticket — show brief coordinate label (Feature 3)
  if (passenger.destination_lat != null && passenger.destination_lng != null) {
    return `GPS (${Number(passenger.destination_lat).toFixed(4)}, ${Number(passenger.destination_lng).toFixed(4)})`;
  }

  return 'N/A';
};

export default function usePassengersByTrip(passengers, activeTrip) {
  return useMemo(() => {
    const groups = new Map();

    (passengers || []).forEach((passenger, index) => {
      const tripId =
        passenger?.trip_id ??
        passenger?.trip?.trip_id ??
        activeTrip?.trip_id ??
        'unassigned';

      const routeName =
        passenger?.trip?.fleet_route?.route?.route_name ||
        activeTrip?.fleet_route?.route?.route_name ||
        null;

      const key = String(tripId);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          tripId,
          routeName,
          passengers: [],
        });
      }

      groups.get(key).passengers.push({
        ...passenger,
        destination_display: resolveDestination(passenger),
        row_number: index + 1,
      });
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      passengers: group.passengers.map((passenger, idx) => ({
        ...passenger,
        row_number: idx + 1,
      })),
    }));
  }, [passengers, activeTrip]);
}
