import { useState } from 'react';
import { AtSign, Calendar, Loader2, Mail, MapPin, UserRound } from 'lucide-react';
import Modal from '../../ui/Modal';
import IconField from '../../ui/IconField';
import PasswordField from '../../ui/PasswordField';
import PhoneInput from '../../ui/PhoneInput';
import { GENDER_OPTIONS } from '../../../utils/gender';
import { editStaffForm, emptyStaffForm, needsUsername, roleLabel, serverFieldErrors, toCreatePayload, toUpdatePayload, validateStaffForm } from '../../../utils/staffForm';
import { apiFieldErrors } from '../../../api/hooks/Staff/useStaffDirectory';

/**
 * Batch 46: Add Staff and Edit Staff, one form. Add uses the sign-up fields and rules (shared IconField, PasswordField,
 * accountFormRules) plus the staff extras: Role, Username, required Address and Birth date. Not on this form, on
 * purpose: email verification, terms and rewards (passenger only) and a license number (out of scope).
 * Edit shows only what an Operator may change: username, phone and email.
 * Batch 60 items 3 and 4 (user, 2026-11-11): the username shows only for crew (an Operator signs in with the email,
 * which gets the login code); the Add form is laid out across the width, since the Operator portal is used on a PC.
 */
// Batch 48 Phase 3: fixedRole hides the Role choice (the Super Admin's Add Company Admin uses 'operator'); addTitle names it.
export default function StaffFormModal({ mode = 'add', member = null, defaultRole = 'driver', fixedRole = null, addTitle = 'Add Staff', submitLabel = null, onClose, onSubmit }) {
  const [form, setForm] = useState(() => (mode === 'edit' ? editStaffForm(member) : emptyStaffForm(fixedRole || defaultRole)));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const showUsername = needsUsername(form.role);

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

  const title = mode === 'edit' ? `Edit ${member?.name ?? 'staff'}` : addTitle;
  const isAdd = mode === 'add';
  const row = isAdd ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4';

  const usernameField = showUsername && (
    <IconField id="staff-username" label="Username (for signing in)" icon={AtSign} placeholder="juan.delacruz" autoComplete="off" autoCapitalize="none" value={form.username} onChange={(event) => update('username', event.target.value)} error={errors.username} hint="Letters, numbers, dots, dashes or underscores." />
  );
  const emailField = (
    <IconField id="staff-email" label="Email Address" type="email" inputMode="email" icon={Mail} placeholder="juan@example.com" autoComplete="off" value={form.email} onChange={(event) => update('email', event.target.value)} error={errors.email} hint={mode === 'edit' ? 'A new email signs them out; they sign in again with it.' : (showUsername ? undefined : 'They sign in with this email and get their login code here.')} />
  );
  const phoneField = (
    <PhoneInput id="staff-phone" label="Phone" callingCode={form.callingCode} local={form.phoneLocal} onChange={({ callingCode, local }) => { update('callingCode', callingCode); update('phoneLocal', local); }} error={errors.phone} />
  );

  return (
    <Modal open onClose={onClose} title={title} size={isAdd ? 'wide' : 'md'} fullScreenOnMobile>
      <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-label={title}>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        {isAdd ? (
          <>
            <div className={row}>
              {!fixedRole && <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900" htmlFor="staff-role">Role</label>
                <select id="staff-role" value={form.role} onChange={(event) => update('role', event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="driver">Driver</option>
                  <option value="conductor">Chauffeur</option>
                  <option value="operator">Operator</option>
                </select>
              </div>}
              <IconField id="staff-firstName" label="First Name" icon={UserRound} placeholder="Juan" autoComplete="off" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} error={errors.firstName} />
              <IconField id="staff-lastName" label="Last Name" icon={UserRound} placeholder="Dela Cruz" autoComplete="off" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} error={errors.lastName} />
            </div>
            {!fixedRole && form.role === 'operator' && <p className="-mt-1 text-xs text-slate-500">An Operator schedules trips and handles the day. They can see your buses, fares and staff but not change them. Only the Super Admin can make someone a Company Admin.</p>}

            <div className={row}>
              {usernameField}
              {emailField}
              {phoneField}
            </div>

            <div className={row}>
              <IconField id="staff-birthDate" label="Birth Date" type="date" icon={Calendar} inputClassName="font-data" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(event) => update('birthDate', event.target.value)} error={errors.birthDate} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900" htmlFor="staff-gender">Gender (optional)</label>
                <select id="staff-gender" value={form.gender} onChange={(event) => update('gender', event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Choose (optional)</option>
                  {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <IconField id="staff-address" label="Address" icon={MapPin} placeholder="House no., street, barangay, city or municipality" autoComplete="off" value={form.address} onChange={(event) => update('address', event.target.value)} error={errors.address} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField id="staff-password" label="First Password" placeholder="Create a strong password" value={form.password} onChange={(value) => update('password', value)} error={errors.password} showStrength />
              <PasswordField id="staff-confirm" label="Confirm Password" placeholder="Repeat the password" toggleLabel="confirm password" value={form.confirmPassword} onChange={(value) => update('confirmPassword', value)} error={errors.confirmPassword} />
            </div>
            <p className="text-xs text-slate-500">Give this password to them in person. At their first sign-in they can change it.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {roleLabel(member?.role)}. You can change {showUsername ? 'the username, phone and email' : 'the phone and email'}. The name stays as it is.
            </p>
            {usernameField}
            {emailField}
            {phoneField}
          </>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {mode === 'edit' ? 'Save changes' : (submitLabel || addTitle)}
          </button>
        </div>
      </form>
    </Modal>
  );
}
