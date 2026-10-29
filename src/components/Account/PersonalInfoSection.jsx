import { useState } from 'react';
import { Pencil } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import ReadOnlyField from './ReadOnlyField';
import { GENDER_OPTIONS } from '../../utils/gender';

const formFrom = (profile) => ({
  name: profile?.name ?? '',
  phone_num: profile?.phone_num ?? '',
  gender: profile?.gender ?? '',
});

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
    const phone = form.phone_num.trim();
    if (name.length < 2) {
      setResult({ ok: false, message: 'Enter your full name.' });
      return;
    }
    if (!phone) {
      setResult({ ok: false, message: 'Enter your phone number.' });
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
          <FormInput label="Phone" type="tel" value={form.phone_num} onChange={set('phone_num')} maxLength={20} autoComplete="tel" required />
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
