import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import StaffService from '../../api/StaffService/StaffBaseService';

/**
 * Step-up re-authentication modal: the signed-in staff member re-enters their
 * password. On success the backend issues a 15-minute step-up token.
 *
 * Usage:
 *   <StepUpModal
 *     open={showStepUp}
 *     onClose={() => setShowStepUp(false)}
 *     onVerified={({ token, expiresIn }) => { ...keep token, retry the action... }}
 *   />
 * The token is sent on the sensitive call as the X-Step-Up-Token header.
 */
export default function StepUpModal({ open, onClose, onVerified }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassword('');
    setError('');
    setSubmitting(false);
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await StaffService.stepUpVerifyPassword(password);
      const token = res?.data?.step_up_token;
      if (!token) throw new Error('Verification failed. Please try again.');
      setPassword('');
      onVerified({ token, expiresIn: Number(res?.data?.expires_in) || 900 });
    } catch (err) {
      setError(err?.message || 'Verification failed. Please try again.');
      setPassword('');
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-up-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0e1a] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
          </div>
          <h2 id="step-up-title" className="text-lg font-bold text-white">Confirm your password</h2>
          <p className="text-sm text-gray-400">
            This change affects ticket prices. Re-enter your password to continue.
          </p>
        </div>

        <input
          ref={inputRef}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          aria-label="Password"
          disabled={submitting}
          className="w-full rounded-xl border border-white/10 bg-[#0f1729] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none disabled:opacity-60"
        />

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={!password || submitting}
          className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
        >
          {submitting ? 'Verifying...' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm text-gray-400 transition hover:text-white"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
