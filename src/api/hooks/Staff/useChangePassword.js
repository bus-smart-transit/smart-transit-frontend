import { useState } from 'react';
import StaffBaseService from '../../StaffService/StaffBaseService';
import { compactErrors, confirmPasswordError, passwordError } from '../../../utils/accountFormRules';

const EMPTY = { currentPassword: '', password: '', passwordConfirmation: '' };

/**
 * Batch 46 (decided 2026-11-05): a staff member changes their own password with the current one (the profile's
 * "Change password", and the one-time offer after a crew member's first sign-in). Other devices are signed out by
 * the server. `skip` answers the one-time offer without changing anything.
 */
export default function useChangePassword({ onDone } = {}) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setError('');
    setMessage('');
  };

  const submit = async (event) => {
    event?.preventDefault?.();
    const found = compactErrors({
      currentPassword: form.currentPassword ? '' : 'Enter your current password',
      password: passwordError(form.password),
      passwordConfirmation: confirmPasswordError(form.password, form.passwordConfirmation),
    });
    if (Object.keys(found).length) {
      setErrors(found);
      return false;
    }
    setSaving(true);
    try {
      const res = await StaffBaseService.changePassword(form);
      setForm(EMPTY);
      setMessage(res?.message || 'Password changed.');
      onDone?.();
      return true;
    } catch (err) {
      const fields = err?.cause?.response?.data?.errors ?? {};
      setErrors(compactErrors({
        currentPassword: fields.current_password?.[0] ?? '',
        password: fields.password?.[0] ?? '',
      }));
      setError(err?.message || 'Could not change the password.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    setSaving(true);
    try {
      await StaffBaseService.skipPasswordPrompt();
    } catch {
      // Skipping is only a reminder; if it fails, the offer simply shows again at the next sign-in.
    } finally {
      setSaving(false);
      onDone?.();
    }
  };

  return { form, errors, message, error, saving, update, submit, skip };
}
