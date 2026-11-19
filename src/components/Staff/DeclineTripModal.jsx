import { useState } from 'react';
import { ModalShell } from '../ui/Modal';

const REASONS = [
  { value: 'sick', label: 'Sick' },
  { value: 'vehicle_issue', label: 'Vehicle issue' },
  { value: 'schedule_conflict', label: 'Schedule conflict' },
  { value: 'other', label: 'Others' },
];

const TEXT_MAX = 300;

/**
 * Shared decline-request dialog for Driver and Chauffeur (C6). It owns its
 * form state, so nothing is lost when the request fails: the modal stays
 * open with the typed text and shows the server's message next to the field.
 * User text is only ever rendered by React (escaped), never as HTML.
 */
export default function DeclineTripModal({ trip, scheduleLabel, submitting, errors = {}, onCancel, onSubmit }) {
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [localError, setLocalError] = useState('');

  const needsText = reasonCode === 'other';
  const textError = localError || errors.reason_text || '';
  const generalError = errors.status || errors.trip || errors.role || errors.reason_code || errors.request || '';

  const handleSubmit = () => {
    if (needsText && !reasonText.trim()) {
      setLocalError('Please describe your reason.');
      return;
    }
    setLocalError('');
    onSubmit({ reasonCode, reasonText: needsText ? reasonText : '' });
  };

  return (
    <ModalShell label="Request to decline this trip" onClose={onCancel} closeOnOverlay={false} overlayClassName="bg-black/60">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="mb-2 text-base font-bold text-slate-100">Request to Decline This Trip?</h3>
        <p className="mb-3 text-sm text-slate-300">
          {trip?.fleet_route?.route?.origin || '-'} → {trip?.fleet_route?.route?.destination || '-'} · {scheduleLabel}
        </p>
        <p className="mb-4 text-sm text-slate-400">
          Your request goes to the Operator as &quot;For Approval&quot;. You stay assigned until the Operator approves it.
        </p>

        <label className="mb-3 block text-sm text-slate-300">
          Reason (optional)
          <select
            value={reasonCode}
            onChange={(e) => { setReasonCode(e.target.value); setLocalError(''); }}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
            disabled={submitting}
          >
            <option value="">No reason given</option>
            {REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
          </select>
        </label>

        {needsText && (
          <label className="mb-3 block text-sm text-slate-300">
            Describe your reason
            <textarea
              value={reasonText}
              onChange={(e) => { setReasonText(e.target.value); setLocalError(''); }}
              maxLength={TEXT_MAX}
              rows={3}
              disabled={submitting}
              aria-invalid={Boolean(textError)}
              className={`mt-1 w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 ${textError ? 'border-red-500' : 'border-slate-700'}`}
            />
            <span className="mt-1 flex justify-between text-xs">
              <span className="text-red-400">{textError}</span>
              <span className="text-slate-500">{reasonText.length}/{TEXT_MAX}</span>
            </span>
          </label>
        )}

        {generalError && <p className="mb-3 text-sm text-red-400" role="alert">{generalError}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={submitting}>Cancel</button>
          <button type="button" onClick={handleSubmit} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={submitting}>{submitting ? 'Sending...' : 'Send Request'}</button>
        </div>
      </div>
    </ModalShell>
  );
}
