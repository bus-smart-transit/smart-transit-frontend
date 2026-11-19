import { useEffect, useMemo, useState } from 'react';
import { buildTicketImageModel, renderTicketFile, ticketFileName } from '../../../utils/ticketImage';

/**
 * Renders the ticket image ahead of time (when the ticket opens), so the click that saves
 * it has a finished File and never waits on async work. `enabled` is the same flag that
 * decides whether the screen shows the QR: when it is false nothing is drawn at all.
 *
 * Returns { file, status: 'idle' | 'preparing' | 'ready' | 'error', error }.
 */
export default function useTicketImage(ticket, { group = false, groupSize = 1, enabled = true } = {}) {
  const model = useMemo(() => buildTicketImageModel(ticket, { group, groupSize }), [ticket, group, groupSize]);
  const fileName = ticketFileName(ticket, { group });
  // The key carries everything that decides the picture; the effect reads the model back from it.
  const key = enabled && model.qrContent ? JSON.stringify({ model, fileName }) : null;
  const [result, setResult] = useState({ key: null, file: null, error: '' });

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const { model: drawn, fileName: name } = JSON.parse(key);
    renderTicketFile(drawn, name)
      .then((file) => { if (!cancelled) setResult({ key, file, error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key, file: null, error: err?.message || 'The image could not be prepared.' }); });
    return () => { cancelled = true; };
  }, [key]);

  if (!key) return { file: null, status: 'idle', error: '' };
  if (result.key !== key) return { file: null, status: 'preparing', error: '' };
  if (result.error) return { file: null, status: 'error', error: result.error };
  return { file: result.file, status: 'ready', error: '' };
}
