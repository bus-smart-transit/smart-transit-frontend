import { useState } from 'react';

/**
 * Batch 67 (user, 2026-11-13): "Send me text messages" on the Account page of every portal. Off until the person turns
 * it on; the server decides (PATCH account/text-messages) and every text checks it first. `service` is the portal's own
 * API service (PassengerService, DriverService, ConductorService or OperatorService).
 *
 * Returns { value, saving, message, phone, onChange(next) } for PreferencesSection.
 */
export default function useTextMessages(service, profile) {
  const fromProfile = Boolean(profile?.sms_opt_in ?? profile?.user?.sms_opt_in ?? false);
  const [override, setOverride] = useState(null); // the value saved on this page, until the profile reloads
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const value = override ?? fromProfile;

  const onChange = async (next) => {
    setSaving(true);
    setMessage('');
    try {
      const res = await service.setTextMessages(next);
      setOverride(Boolean(res?.data?.sms_opt_in ?? next));
      setMessage(next ? 'Text messages are on.' : 'Text messages are off.');
    } catch (err) {
      setMessage(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return { value, saving, message, phone: profile?.phone_num ?? null, onChange };
}
