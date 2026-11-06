import { useState } from 'react';
import { Pencil } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import ReadOnlyField from './ReadOnlyField';
import PhoneInput from '../ui/PhoneInput';
import { PHONE_INVALID_MESSAGE, splitPhone, toE164 } from '../../utils/phone';
import { GENDER_OPTIONS } from '../../utils/gender';

// Batch 47 part B: the phone is edited as calling code + local number (PhoneInput); an older stored shape such as
// 0917... opens as +63 917... (utils/phone.js splitPhone).
const formFrom = (profile) => {
  const { callingCode, local } = splitPhone(profile?.phone_num);
  return { name: profile?.name ?? '', callingCode, phoneLocal: local, gender: profile?.gender ?? '' };
};

/**
 * Name, email and phone (and a passenger's address). Staff see them read-only; the note says who can change them.
 * 2026-10-29 (Batch 36 Phase 2): when `onSave` is given (passengers only), an Edit button lets them change their
 * name, phone and gender. `onSave(changes)` resolves to `{ ok, message }`. Email and address stay locked.
 */
export default function PersonalInfoSection({ view, profile = null, onSave = null }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => formFrom(profile));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const startEdit = () => {
    setForm(formFrom(profile));
    setResult(null);
    setEditing(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      setResult({ ok: false, message: 'Enter your full name.' });
      return;
    }
    if (!form.phoneLocal.trim()) {
      setResult({ ok: false, message: 'Enter your phone number.' });
      return;
    }
    const phone = toE164(form.callingCode, form.phoneLocal);
    if (!phone) {
      setResult({ ok: false, message: PHONE_INVALID_MESSAGE });
      return;
    }
    setSaving(true);
    const outcome = await onSave({ name, phone_num: phone, gender: form.gender || null });
    setSaving(false);
    setResult(outcome);
    if (outcome?.ok) setEditing(false);
  };

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <Card as="section" aria-labelledby="profile-personal-title" padding="md" data-testid="profile-personal">
      <div className="flex items-center justify-between gap-3">
        <h3 id="profile-personal-title" className="font-display text-base font-semibold text-navy-950">Personal information</h3>
        {onSave && !editing && (
          <Button variant="outline" size="xs" icon={Pencil} onClick={startEdit} data-testid="profile-edit">Edit</Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="profile-edit-form">
          <FormInput label="Name" value={form.name} onChange={set('name')} maxLength={255} autoComplete="name" required />
          <PhoneInput
            id="profile-phone"
            label="Phone"
            callingCode={form.callingCode}
            local={form.phoneLocal}
            onChange={({ callingCode, local }) => setForm((prev) => ({ ...prev, callingCode, phoneLocal: local }))}
          />
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-navy-900">Gender</span>
            <select
              value={form.gender}
              onChange={set('gender')}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
            >
              <option value="">Not provided</option>
              {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <dl className="grid gap-4">
            <ReadOnlyField label="Email" value={view.email} testId="field-email" />
          </dl>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" loading={saving} disabled={saving}>Save</Button>
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setEditing(false); setResult(null); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Name" value={view.name} testId="field-name" />
          <ReadOnlyField label="Email" value={view.email} testId="field-email" />
          {/* 2026-11-05: Drivers and Chauffeurs can sign in with this instead of their email. */}
          {view.username && <ReadOnlyField label="Username (for signing in)" value={view.username} mono testId="field-username" />}
          <ReadOnlyField label="Phone" value={view.phone} mono testId="field-phone" />
          <ReadOnlyField label="Gender" value={view.gender} testId="field-gender" />
          {view.role === 'passenger' && <ReadOnlyField label="Address" value={view.address} testId="field-address" />}
        </dl>
      )}

      {result && (
        <p role={result.ok ? 'status' : 'alert'} data-testid="profile-edit-result" className={`mt-3 text-sm ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>
          {result.message}
        </p>
      )}
      {view.lockedNote && <p data-testid="locked-note" className="mt-3 text-xs text-slate-500">{view.lockedNote}</p>}
    </Card>
  );
}
