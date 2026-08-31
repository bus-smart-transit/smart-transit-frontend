import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Route, ShieldCheck, TrainFront, TriangleAlert, CheckCircle, Clock } from 'lucide-react';
import { useLogin } from '../../../api/hooks/Passenger/login';
import Button from '../../ui/Button';
import FormInput from '../../ui/FormInput';
import Card from '../../ui/Card';

export default function LoginPage() {
  const otpRefs = useRef([]);
  const {
    form,
    errors,
    error,
    isLoading,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    update,
    handleSubmit,
    // OTP
    otpRequired,
    otp,
    setOtp,
    otpError,
    otpEmailMasked,
    handleVerifyOtp,
    handleResendOtp,
    cancelOtp,
  } = useLogin();

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

  const BENEFITS = [
    { icon: CheckCircle, label: 'Book and pay online' },
    { icon: ShieldCheck, label: 'Live bus tracking' },
    { icon: Clock, label: 'Manage your tickets' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col lg:grid lg:grid-cols-[1fr_1fr] lg:gap-0">
      {/* Left Side: Messaging & Benefits */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 px-8 py-12 text-white">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500">
              <TrainFront className="h-6 w-6" />
            </div>
            <span className="font-display text-xl">SmartTransit</span>
          </Link>

          <div className="max-w-sm space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 border border-teal-500/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-300">
              <Route className="h-3.5 w-3.5" />
              Passenger Login
            </span>
            <h1 className="font-display text-4xl leading-tight">
              Welcome back to SmartTransit
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Your transportation partner for seamless, stress-free commuting across Davao Region.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20">
                <Icon size={20} className="text-teal-300" />
              </span>
              <span className="text-slate-300">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} SmartTransit. Davao Region XI.
        </p>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Mobile Header */}
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <TrainFront className="h-6 w-6 text-teal-600" />
              <span className="font-display text-slate-900">SmartTransit</span>
            </Link>
          </div>

          {!otpRequired ? (
            <>
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  <Route className="h-3.5 w-3.5" />
                  Passenger Access
                </span>
                <h2 className="font-display text-3xl text-slate-950 mt-4">Sign in</h2>
                <p className="text-slate-600 mt-2 text-sm">
                  Access your tickets, track buses, and manage your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* General error */}
                {error && (
                  <Card className="bg-red-50 border-red-200 p-4 flex items-start gap-3">
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
                  type={showPassword ? 'text' : 'password'}
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
                  <Link to="/forgot-password" className="text-teal-600 hover:text-teal-700 font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                  loading={isLoading}
                >
                  Sign In
                </Button>
              </form>

              {/* Sign up link */}
              <p className="text-center text-sm text-slate-600 mt-6">
                Don't have an account?{' '}
                <Link to="/passenger/signup" className="font-semibold text-teal-600 hover:text-teal-700">
                  Create Account
                </Link>
              </p>
            </>
          ) : (
            /* OTP Verification Screen */
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-slate-950">Verify your identity</h2>
                <p className="text-slate-600 mt-2 text-sm">
                  We've sent a 6-digit code to <strong>{otpEmailMasked}</strong>
                </p>
              </div>

              {otpError && (
                <Card className="bg-red-50 border-red-200 p-4 flex items-start gap-3">
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
        </div>
      </div>
    </div>
  );
}


