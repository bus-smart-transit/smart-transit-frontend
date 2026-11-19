import { useCallback, useEffect, useState } from 'react';
import { extractFieldErrors } from '../../../utils/assignmentRequest';

const MESSAGE_TTL_MS = 6000;

/**
 * Batch 28, item 1: the Driver's / Chauffeur's assignment cards (one per shift block, plus one per
 * standalone trip). Accept and decline happen once, on the card; the server writes the block and all
 * its legs in one transaction, so this hook only sends the request and reloads.
 *
 * On a failed decline the dialog stays open with what the person typed and the server's field
 * errors, so a 422 never loses their text.
 */
export default function useAssignmentCards({ service, onChanged }) {
  const [cards, setCards] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState(null);
  const [message, setMessage] = useState('');
  const [confirmDecline, setConfirmDecline] = useState(null);
  const [declineErrors, setDeclineErrors] = useState({});
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  // A notice such as "Trip accepted." is a confirmation, not a panel: it clears itself.
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), MESSAGE_TTL_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const refresh = useCallback(async () => {
    try {
      const res = await service.getAssignments();
      setCards(Array.isArray(res?.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Unable to load your assignments.');
    } finally {
      setLoaded(true);
    }
  }, [service]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await service.getAssignments();
        if (cancelled) return;
        setCards(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load your assignments.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [service]);

  const accept = async (card) => {
    if (!card?.key) return;
    setBusyKey(card.key);
    setMessage('');
    try {
      await service.acceptAssignment(card.key);
      setMessage(card.kind === 'block' ? 'Shift block accepted.' : 'Trip accepted.');
      await refresh();
      onChanged?.();
    } catch (err) {
      setMessage(err?.message || 'Unable to accept.');
      await refresh();
    } finally {
      setBusyKey(null);
    }
  };

  const submitDecline = async ({ reasonCode, reasonText }) => {
    const card = confirmDecline;
    if (!card?.key) return;
    setDeclineSubmitting(true);
    setDeclineErrors({});
    try {
      const payload = {};
      if (reasonCode) payload.reason_code = reasonCode;
      if (reasonCode === 'other' && reasonText) payload.reason_text = reasonText;
      await service.declineAssignment(card.key, payload);
      setMessage('Request sent. It is now waiting for Operator approval.');
      setConfirmDecline(null);
      await refresh();
      onChanged?.();
    } catch (err) {
      const fields = extractFieldErrors(err);
      setDeclineErrors(Object.keys(fields).length > 0 ? fields : { request: err?.message || 'Unable to send the request.' });
    } finally {
      setDeclineSubmitting(false);
    }
  };

  const cancelDecline = () => {
    setConfirmDecline(null);
    setDeclineErrors({});
  };

  return {
    cards, loaded, error, busyKey, message, setMessage,
    refresh, accept,
    confirmDecline, setConfirmDecline, declineErrors, declineSubmitting, submitDecline, cancelDecline,
  };
}
