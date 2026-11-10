import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Mail, TriangleAlert, CheckCircle } from 'lucide-react';
import AuthShell from '../Auth/AuthShell';
import GoogleButton from '../Auth/GoogleButton';
import { useLogin } from '../../../api/hooks/Passenger/login';
import Button from '../../ui/Button';
import FormInput from '../../ui/FormInput';
import Card from '../../ui/Card';
import { useRegion } from '../../../api/hooks/useRegion';

export default function LoginPage() {
  const otpRefs = useRef([]);
  // A page that sends the person here (for example after a password reset) can leave a one-line notice.
  const notice = useLocation().state?.notice || '';
  const region = useRegion();
  const {
    form,
    errors,
    error,
    isLoading,
    rememberMe,
    setRememberMe,
    goToDashboardAfterLogin,
    setGoToDashboardAfterLogin,
    update,
    handleSubmit,
    // OTP
    otpRequired,
    verifyingEmail,
    otp,
    setOtp,
    otpError,
    otpEmailMasked,
    otpMinutes,
    handleVerifyOtp,
    handleResendOtp,
    cancelOtp } = useLogin();

  // Derive individual digit slots from the single otp string.
  const otpDigits = Array.from({ length: 6 }, (_, i) => otp[i] ?? '');

  const commitOtpDigit = (index, value) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = otpDigits.slice();
    next[index] = cleaned;
    const combined = next.join('');
    setOtp(combined);
    if (cleaned && index < 5) otpRefs.current[index + 1]?.focus();
    if (combined.length === 6 && !next.includes('')) void handleVerifyOtp({ preventDefault: () => {} });
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft'  && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    setOtp(pasted);
    otpRefs.current[Math.min(5, Math.max(0, pasted.length - 1))]?.focus();
    if (pasted.length === 6) {
      void handleVerifyOtp({ preventDefault: () => {} });
    }
  };

  // 2026-11-06 (passenger redesign, joshua-frontend): the form sits in the shared AuthShell; its logic is unchanged.
  return (
    <AuthShell
      photoSide="right"
      title="Your commute, simplified."
      text={`Sign in to manage your tickets, follow your bus live, and keep track of every trip${region?.name ? ` across ${region.name}` : ''}.`}
      tagline="Your next trip starts here."
    >
          {!otpRequired ? (
            <>
              <div className="mb-8">
                <span className="inline-flex items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800">
                  Passenger Login
                </span>
                <h1 className="mt-4 font-display text-3xl font-bold text-navy-950 sm:text-4xl">Welcome back</h1>
                <p className="mt-2 text-sm text-slate-500">Sign in to access your trips and tickets.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {notice && (
                  <Card role="status" className="bg-emerald-50 border-emerald-200 p-4 flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-emerald-900">{notice}</p>
                  </Card>
                )}
                {/* General error */}
                {error && (
                  <Card role="alert" className="bg-red-50 border-red-200 p-4 flex items-start gap-3">
                    <TriangleAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">{error}</p>
                    </div>
                  </Card>
                )}

                {/* Demo credentials info */}
                {import.meta.env.VITE_SHOW_DEMO_CREDS === 'true' && (
                  <Card className="bg-teal-50 border-teal-200 p-4">
                    <p className="text-xs text-teal-900">
                      <strong>Demo Account:</strong> joshua@example.com / Passenger123
                    </p>
                  </Card>
                )}

                <FormInput
                  label="Email Address"
                  type="email"
                  required
                  placeholder="you@email.com"
                  icon={Mail}
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  error={errors.email}
                  disabled={isLoading}
                />

                <FormInput
                  label="Password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  icon={Lock}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  error={errors.password}
                  disabled={isLoading}
                />

                {/* Remember me & forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-700">Remember me</span>
                  </label>
                  <Link to="/passenger/forgot-password" className="text-teal-600 hover:text-teal-700 font-medium">
                    Forgot password?
                  </Link>
                </div>

                <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={goToDashboardAfterLogin}
                    onChange={(e) => setGoToDashboardAfterLogin(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Go directly to passenger dashboard after login</span>
                </label>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                  loading={isLoading}
                >
                  Log In
                </Button>
              </form>

              {/* Sign up link */}
              <p className="text-center text-sm text-slate-600 mt-6">
                Don't have an account?{' '}
                <Link to="/passenger/signup" className="font-semibold text-navy-800 hover:text-navy-700">
                  Sign Up
                </Link>
              </p>
              <GoogleButton />
            </>
          ) : (
            /* OTP Verification Screen */
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-slate-950">{verifyingEmail ? 'Verify your email' : 'Verify your identity'}</h2>
                <p className="text-slate-600 mt-2 text-sm">
                  We've sent a 6-digit code to <strong>{otpEmailMasked}</strong>
                </p>
                {verifyingEmail && (
                  <p className="text-slate-600 mt-1 text-sm" data-testid="verify-email-note">
                    Enter it to verify your email and finish creating your account.{otpMinutes ? ` The code works for ${otpMinutes} minute${otpMinutes === 1 ? '' : 's'}.` : ''}
                  </p>
                )}
              </div>

              {otpError && (
                <Card role="alert" className="bg-red-50 border-red-200 p-4 flex items-start gap-3">
                  <TriangleAlert className="h-5 w-5 text-red-600 shrink-0" />
                  <p className="text-sm font-medium text-red-900">{otpError}</p>
                </Card>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-3">
                  Enter 6-digit code
                </label>
                <div className="flex gap-2 justify-between">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => commitOtpDigit(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="h-12 w-12 rounded-lg border-2 border-slate-200 text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isLoading || otp.length !== 6}
                loading={isLoading}
                onClick={(e) => handleVerifyOtp(e)}
              >
                Verify Code
              </Button>

              <div className="flex flex-col gap-3 text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                  disabled={isLoading}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={cancelOtp}
                  className="text-slate-600 hover:text-slate-700"
                  disabled={isLoading}
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}
    </AuthShell>
  );
}


