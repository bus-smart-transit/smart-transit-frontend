import { useCallback, useEffect, useState } from 'react';
import ConductorService from '../../StaffService/ConductorService';

/**
 * 2026-11-25 (user): baggage paid in cash to the Chauffeur on board. Loads the bus company's prices by size, and records
 * or takes back a payment for one passenger. `onChanged` runs after a change, so the passenger list and the shift cash
 * are read again.
 */
export default function useBaggageCharges({ enabled = true, onChanged = () => {} } = {}) {
  const [fees, setFees] = useState([]);
  const [feesError, setFeesError] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    ConductorService.getBaggageFees()
      .then((response) => {
        if (active) setFees(Array.isArray(response?.data) ? response.data : []);
      })
      .catch((err) => {
        if (active) setFeesError(err?.message || 'Baggage prices could not be loaded.');
      });
    return () => { active = false; };
  }, [enabled]);

  const open = useCallback((passenger) => {
    setError('');
    setTarget(passenger);
  }, []);

  const close = useCallback(() => {
    setError('');
    setTarget(null);
  }, []);

  const record = useCallback(async (size, stubNumber) => {
    if (!target?.ticket_id) return false;
    setBusy(true);
    setError('');
    try {
      const response = await ConductorService.recordBaggage(target.ticket_id, size, stubNumber);
      const charge = response?.data ?? null;
      setTarget((current) => (current ? { ...current, baggage_charges: [...(current.baggage_charges || []), charge].filter(Boolean) } : current));
      onChanged();
      return true;
    } catch (err) {
      setError(err?.message || 'The baggage payment could not be saved. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [target, onChanged]);

  const takeBack = useCallback(async (chargeId) => {
    setBusy(true);
    setError('');
    try {
      await ConductorService.voidBaggage(chargeId);
      setTarget((current) => (current ? { ...current, baggage_charges: (current.baggage_charges || []).filter((c) => c.baggage_charge_id !== chargeId) } : current));
      onChanged();
      return true;
    } catch (err) {
      setError(err?.message || 'The baggage payment could not be removed. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [onChanged]);

  return { fees, feesError, target, busy, error, open, close, record, takeBack };
}
