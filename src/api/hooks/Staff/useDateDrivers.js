import { useEffect, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

const NO_DRIVERS_ERROR = 'Could not load available drivers for this date.';

/**
 * Drivers an Operator can still assign on one trip date (the server leaves out anyone already on that day or whose
 * release was approved). With no date it hands back `fallback`, the unfiltered list. `loading` is true from the moment a
 * date is chosen until its answer arrives, so a picker never offers the previous date's drivers.
 */
export default function useDateDrivers(tripDate, fallback) {
  const [answer, setAnswer] = useState({ date: '', drivers: [], error: '' });

  useEffect(() => {
    if (!tripDate) return undefined;
    let cancelled = false;
    OperatorService.getOperatorDrivers({ trip_date: tripDate })
      .then((response) => { if (!cancelled) setAnswer({ date: tripDate, drivers: Array.isArray(response?.data) ? response.data : [], error: '' }); })
      .catch((error) => { if (!cancelled) setAnswer({ date: tripDate, drivers: [], error: error?.message || NO_DRIVERS_ERROR }); });
    return () => { cancelled = true; };
  }, [tripDate]);

  if (!tripDate) return { drivers: fallback, loading: false, error: '' };
  const ready = answer.date === tripDate;
  return { drivers: ready ? answer.drivers : [], loading: !ready, error: ready ? answer.error : '' };
}
