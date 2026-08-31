import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import StaffService from '../../api/StaffService/StaffService';

/**
 * Step-up re-authentication modal.
 *
 * Usage:
 *   const [stepUpToken, setStepUpToken] = useState(null);
 *   const [showStepUp, setShowStepUp] = useState(false);
 *
 *   // Before calling a sensitive action:
 *   if (!stepUpToken) { setShowStepUp(true); return; }
 *   await callSensitiveApi({ headers: { 'X-Step-Up-Token': stepUpToken } });
 *
 *   <StepUpModal
 *     open={showStepUp}
 *     onClose={() => setShowStepUp(false)}
 *     onVerified={(token) => { setStepUpToken(token); setShowStepUp(false); }}
 *   />
 */
export default function StepUpModal({ open, onClose, onVerified }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'sent' | 'loading'
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [emailMasked, setEmailMasked] = useState('');
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  const sendOtp = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      const res = await StaffService.stepUpInitiate();
      setEmailMasked(res?.data?.email_masked ?? '');
      setPhase('sent');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
      setPhase('idle');
    }
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('idle');
    setDigits(['', '', '', '', '', '']);
    setError('');
    void sendOtp();
  }, [open, sendOtp]);

  const handleDigit = (idx, value) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    if (clean && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== '')) void submit(next.join(''));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      void submit(text);
    }
  };

  const submit = async (otp) => {
    setPhase('loading');
    setError('');
    try {
      const res = await StaffService.stepUpVerify(otp);
      const token = res?.data?.step_up_token;
      if (token) onVerified(token);
    } catch (err) {
      setError(err?.message || 'Incorrect code. Please try again.');
      setDigits(['', '', '', '', '', '']);
      setPhase('sent');
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0e1a] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Step-up Verification</h2>
          <p className="text-sm text-gray-400">
            {phase === 'idle'
              ? 'Requesting verification code…'
              : phase === 'loading'
              ? 'Processing…'
              : `Enter the 6-digit code sent to ${emailMasked || 'your email'}`}
          </p>
        </div>

        {phase === 'sent' && (
          <div className="mb-4 flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-white/10 bg-[#0f1729] text-center text-xl font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            ))}
          </div>
        )}

        {error && (
          <p className="mb-3 text-center text-sm text-red-400">{error}</p>
        )}

        {phase === 'loading' && (
          <p className="text-center text-sm text-gray-400">Please wait…</p>
        )}

        {phase === 'idle' && (
          <button
            type="button"
            onClick={sendOtp}
            className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Send Verification Code
          </button>
        )}

        {phase === 'sent' && (
          <button
            type="button"
            onClick={sendOtp}
            className="mt-3 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition"
          >
            Didn't receive it? Resend code
          </button>
        )}
      </div>
    </div>
  );
}
