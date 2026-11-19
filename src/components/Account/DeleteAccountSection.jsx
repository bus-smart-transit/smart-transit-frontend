import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Card from '../ui/Card';

/**
 * 2026-11-05: a passenger deletes their own account (Data Privacy Act of 2012, right to erasure). Shown only when the
 * portal passes onDelete (the passenger portal). The server checks the password, refuses while a ticket is still in use,
 * ends every session, and erases the personal data after the grace days unless the passenger signs in again.
 *
 *   onDelete(password)  resolves to { ok, message }; on success the portal signs the passenger out
 *   graceDays           shown in the text (the server's setting; 7 by default)
 */
export default function DeleteAccountSection({ onDelete, graceDays = 7 }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result = await onDelete(password);
    setBusy(false);
    if (!result?.ok) setMessage(result?.message || 'Your account could not be deleted. Please try again.');
  };

  return (
    <Card as="section" aria-labelledby="delete-account-title" padding="md" data-testid="delete-account">
      <h3 id="delete-account-title" className="font-display text-base font-semibold text-navy-950">Delete my account</h3>
      <p className="mt-2 text-sm text-slate-600">
        We sign you out on every device and erase your name, email, phone, address, birth date and gender after {graceDays} days.
        Changed your mind? Sign in again before then and your account stays.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Your past tickets and payments are kept for our records, but without your name. Your reward points will be lost.
        You cannot delete your account while you have a ticket for a trip that has not happened yet, or a refund that is not finished.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 size={16} aria-hidden="true" /> Delete my account
        </button>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3" data-testid="delete-account-form">
          <label className="block text-sm font-medium text-slate-700">
            Enter your password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>I understand that my account and personal details will be deleted.</span>
          </label>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!password || !confirmed || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {busy ? 'Deleting...' : 'Delete my account'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setPassword(''); setConfirmed(false); setMessage(''); }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Keep my account
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
