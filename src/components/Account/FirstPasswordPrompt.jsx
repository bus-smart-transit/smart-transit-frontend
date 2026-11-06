import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import ChangePasswordFields from './ChangePasswordFields';
import useChangePassword from '../../api/hooks/Staff/useChangePassword';

/**
 * Batch 46 (decided 2026-11-05): once, at a Driver's or Chauffeur's first sign-in, offer to change the password their
 * Operator typed. Optional: "Not now" keeps it, and the profile has "Change password" any time. Shown while the
 * profile says `offer_password_change`.
 */
export default function FirstPasswordPrompt({ profile }) {
  const [closed, setClosed] = useState(false);
  const state = useChangePassword({ onDone: () => setClosed(true) });
  if (closed || !profile?.offer_password_change) return null;

  return (
    <Modal open onClose={state.skip} title="Change the password you were given?">
      <form className="space-y-4" onSubmit={state.submit} noValidate aria-label="Change the password you were given">
        <p className="text-sm text-slate-600">Your Operator chose your first password. You can pick your own now, or later on your profile.</p>
        <ChangePasswordFields idPrefix="first-password" state={state} />
        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={state.skip} disabled={state.saving} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Not now</button>
          <button type="submit" disabled={state.saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {state.saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Save new password
          </button>
        </div>
      </form>
    </Modal>
  );
}
