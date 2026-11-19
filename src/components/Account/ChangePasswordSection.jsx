import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import Card from '../ui/Card';
import ChangePasswordFields from './ChangePasswordFields';
import useChangePassword from '../../api/hooks/Staff/useChangePassword';

/** Batch 46: "Change password" on a staff member's profile (Driver, Chauffeur, Operator). */
export default function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const state = useChangePassword({ onDone: () => setOpen(false) });

  return (
    <Card as="section" aria-labelledby="profile-password-title" padding="md" data-testid="profile-password">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <KeyRound aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div>
            <h3 id="profile-password-title" className="font-display text-base font-semibold text-navy-950">Password</h3>
            <p className="text-xs text-slate-500">Changing it signs you out on your other devices.</p>
          </div>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Change password
          </button>
        )}
      </div>
      {state.message && !open && <p role="status" className="mt-3 text-sm font-medium text-teal-700">{state.message}</p>}
      {open && (
        <form className="mt-4 space-y-4" onSubmit={state.submit} noValidate aria-label="Change password">
          <ChangePasswordFields idPrefix="profile-password" state={state} />
          {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={state.saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {state.saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Save new password
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
