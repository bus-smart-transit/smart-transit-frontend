import { useState } from 'react';
import { AtSign, Calendar, Loader2, Mail, MapPin, UserRound } from 'lucide-react';
import Modal from '../../ui/Modal';
import IconField from '../../ui/IconField';
import PasswordField from '../../ui/PasswordField';
import PhoneInput from '../../ui/PhoneInput';
import { GENDER_OPTIONS } from '../../../utils/gender';
import { editStaffForm, emptyStaffForm, roleLabel, serverFieldErrors, toCreatePayload, toUpdatePayload, validateStaffForm } from '../../../utils/staffForm';
import { apiFieldErrors } from '../../../api/hooks/Staff/useStaffDirectory';

/**
 * Batch 46: Add Staff and Edit Staff, one form. Add uses the sign-up fields and rules (shared IconField, PasswordField,
 * accountFormRules) plus the staff extras: Role, Username, required Address and Birth date. Not on this form, on
 * purpose: email verification, terms and rewards (passenger only) and a license number (out of scope).
 * Edit shows only what an Operator may change: username, phone and email.
 */
export default function StaffFormModal({ mode = 'add', member = null, defaultRole = 'driver', onClose, onSubmit }) {
  const [form, setForm] = useState(() => (mode === 'edit' ? editStaffForm(member) : emptyStaffForm(defaultRole)));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validateStaffForm(form, mode);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const payload = mode === 'edit' ? toUpdatePayload(form, member) : toCreatePayload(form);
    if (mode === 'edit' && Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setErrors(serverFieldErrors(apiFieldErrors(err)));
      setError(err?.message || 'Could not save. Please try again.');
      setSaving(false);
    }
  };

  const title = mode === 'edit' ? `Edit ${member?.name ?? 'staff'}` : 'Add Staff';

  return (
    <Modal open onClose={onClose} title={title} fullScreenOnMobile>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-label={title}>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        {mode === 'add' ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-900" htmlFor="staff-role">Role</label>
              <select id="staff-role" value={form.role} onChange={(event) => update('role', event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="driver">Driver</option>
                <option value="conductor">Chauffeur</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <IconField id="staff-firstName" label="First Name" icon={UserRound} placeholder="Juan" autoComplete="off" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} error={errors.firstName} />
              <IconField id="staff-lastName" label="Last Name" icon={UserRound} placeholder="Dela Cruz" autoComplete="off" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} error={errors.lastName} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            {roleLabel(member?.role)}. You can change the username, phone and email. The name stays as it is.
          </p>
        )}

        <IconField id="staff-username" label="Username (for signing in)" icon={AtSign} placeholder="juan.delacruz" autoComplete="off" autoCapitalize="none" value={form.username} onChange={(event) => update('username', event.target.value)} error={errors.username} hint="Letters, numbers, dots, dashes or underscores." />
        <IconField id="staff-email" label="Email Address" type="email" inputMode="email" icon={Mail} placeholder="juan@example.com" autoComplete="off" value={form.email} onChange={(event) => update('email', event.target.value)} error={errors.email} hint={mode === 'edit' ? 'A new email signs them out; they sign in again with it.' : undefined} />
        <PhoneInput id="staff-phone" label="Phone" callingCode={form.callingCode} local={form.phoneLocal} onChange={({ callingCode, local }) => { update('callingCode', callingCode); update('phoneLocal', local); }} error={errors.phone} />

        {mode === 'add' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <IconField id="staff-birthDate" label="Birth Date" type="date" icon={Calendar} inputClassName="font-data" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} error={errors.birthDate} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900" htmlFor="staff-gender">Gender (optional)</label>
                <select id="staff-gender" value={form.gender} onChange={(event) => update('gender', event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Choose (optional)</option>
                  {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
            <IconField id="staff-address" label="Address" icon={MapPin} placeholder="House no., street, barangay, city or municipality" autoComplete="off" value={form.address} onChange={(event) => update('address', event.target.value)} error={errors.address} />
            <PasswordField id="staff-password" label="First Password" placeholder="Create a strong password" value={form.password} onChange={(value) => update('password', value)} error={errors.password} showStrength />
            <PasswordField id="staff-confirm" label="Confirm Password" placeholder="Repeat the password" toggleLabel="confirm password" value={form.confirmPassword} onChange={(value) => update('confirmPassword', value)} error={errors.confirmPassword} />
            <p className="text-xs text-slate-500">Give this password to them in person. At their first sign-in they can change it.</p>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mode === 'edit' ? 'Save changes' : 'Add Staff'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
