import { useState } from 'react';
import { Download } from 'lucide-react';
import Button from '../../ui/Button';
import { saveTicketImage } from '../../../utils/ticketImage';

/**
 * C5: save a ticket (or group) QR as a PNG or JPEG image. On phones that can
 * share files this opens the share sheet (iOS offers "Save Image"); elsewhere it
 * downloads the file. Only enabled once the QR is active, so the existing QR
 * gating is never bypassed. Printing to PDF stays available as the secondary option.
 */
export default function SaveQrButtons({ ticket, departureLabel, group = false, groupSize = 1 }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = Boolean(ticket?.qr_url) && Boolean(group ? ticket?.group_qr_content : ticket?.qr_content);

  const save = async (format) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await saveTicketImage({ ...ticket, departure_label: departureLabel }, format, { group, groupSize });
      setMessage(result === 'cancelled' ? '' : result === 'shared' ? 'Image ready to save.' : 'Image downloaded.');
    } catch (err) {
      setMessage(err?.message || 'The image could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="primary" size="sm" onClick={() => save('png')} disabled={!active || busy} icon={Download}>
        Save as PNG
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => save('jpeg')} disabled={!active || busy}>
        Save as JPEG
      </Button>
      {message && <span role="status" className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
