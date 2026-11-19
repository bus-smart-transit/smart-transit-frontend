import { useState } from 'react';
import PassengerService from '../../PassengerService/PassengerService';
import { DEFAULT_CALLING_CODE, PHONE_INVALID_MESSAGE, toE164 } from '../../../utils/phone';
import { apiFieldErrors } from '../Staff/useStaffDirectory';

/**
 * 2026-11-07: a passenger who signed up with Google adds their mobile number (it is required, decided 2026-11-05).
 * Saves it with the normal profile update; the server checks it again. Returns the field state and save().
 */
export function useAddPhone() {
  const [phone, setPhone] = useState({ callingCode: DEFAULT_CALLING_CODE, local: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e164 = toE164(phone.callingCode, phone.local);
    if (!e164) {
      setError(String(phone.local).trim() ? PHONE_INVALID_MESSAGE : 'Phone number is required');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      await PassengerService.updateProfile({ phone_num: e164 });
      return true;
    } catch (err) {
      setError(Object.values(apiFieldErrors(err)).flat()[0] || err?.message || 'Could not save. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { phone, setPhone: (next) => { setPhone(next); setError(''); }, error, saving, save };
}
