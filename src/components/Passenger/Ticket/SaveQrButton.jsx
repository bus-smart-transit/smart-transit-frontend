import { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '../../ui/Button';
import useTicketImage from '../../../api/hooks/Passenger/useTicketImage';
import { deliverFile } from '../../../utils/ticketImage';
import { detectInAppBrowser } from '../../../utils/inAppBrowser';

/**
 * One primary "Save QR to device" button for a single ticket or a group ticket.
 *
 * - `active` is the same flag that controls the on-screen QR: when the screen would not
 *   show the QR, nothing is drawn and the button is disabled.
 * - The image is drawn when the ticket opens, so the click only hands a ready file to the
 *   device (share sheet on phones, download otherwise).
 * - In-app browsers (Facebook, Messenger, ...) cannot reliably save files, so they get an
 *   "open in your browser" message instead of a button that fails silently.
 */
export default function SaveQrButton({ ticket, group = false, groupSize = 1, active = true }) {
  const inApp = detectInAppBrowser();
  const { file, status, error } = useTicketImage(ticket, { group, groupSize, enabled: active && !inApp });
  const [message, setMessage] = useState('');

  if (inApp) {
    return (
      <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
        Saving the QR does not work inside the {inApp} app. Open this page in your browser (Chrome or Safari) to save it.
      </p>
    );
  }

  const save = () => {
    if (!file) return;
    setMessage('');
    deliverFile(file)
      .then((result) => setMessage(result === 'cancelled' ? '' : result === 'shared' ? 'Choose "Save Image" to keep it.' : 'QR saved to your downloads.'))
      .catch(() => setMessage('The image could not be saved. Try again.'));
  };

  const label = status === 'preparing' ? 'Preparing QR...' : 'Save QR to device';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="primary" size="sm" onClick={save} disabled={!active || status !== 'ready'} icon={Download}>
        {label}
      </Button>
      {status === 'error' && <span role="alert" className="text-xs text-red-600">{error}</span>}
      {message && <span role="status" className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
