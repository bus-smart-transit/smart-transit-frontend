import { useEffect, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

const NO_DRIVERS_ERROR = 'Could not load available drivers for this date.';

const listOf = (response) => (Array.isArray(response?.data) ? response.data : []);

/**
 * The crew an Operator can still assign on one trip date. Anyone already on a trip that day (or whose release was
 * approved) comes with the server's reason (busy_reason) and cannot be picked. 2026-11-24 (user): Chauffeurs are
 * checked the same way as Drivers. With no date it hands back the unfiltered lists (`fallback`, `fallbackConductors`).
 * `loading` is true from the moment a date is chosen until its answer arrives, so a picker never offers the previous
 * date's crew.
 */
export default function useDateDrivers(tripDate, fallback, fallbackConductors = []) {
  const [answer, setAnswer] = useState({ date: '', drivers: [], conductors: [], error: '' });

  useEffect(() => {
    if (!tripDate) return undefined;
    let cancelled = false;
    const params = { trip_date: tripDate, include_busy: 1 };
    Promise.all([OperatorService.getOperatorDrivers(params), OperatorService.getOperatorConductors(params)])
      .then(([drivers, conductors]) => {
        if (!cancelled) setAnswer({ date: tripDate, drivers: listOf(drivers), conductors: listOf(conductors), error: '' });
      })
      .catch((error) => { if (!cancelled) setAnswer({ date: tripDate, drivers: [], conductors: [], error: error?.message || NO_DRIVERS_ERROR }); });
    return () => { cancelled = true; };
  }, [tripDate]);

  if (!tripDate) return { drivers: fallback, conductors: fallbackConductors, loading: false, error: '' };
  const ready = answer.date === tripDate;
  return {
    drivers: ready ? answer.drivers : [],
    conductors: ready ? answer.conductors : [],
    loading: !ready,
    error: ready ? answer.error : '',
  };
}
