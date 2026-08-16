import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, MoveLeft, Route, ShieldCheck, TrainFront, TriangleAlert } from 'lucide-react';
import { useLogin } from '../../../api/hooks/Passenger/login';

export default function LoginPage() {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-200 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col border-b border-slate-800 bg-slate-950/70 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Link to="/" className="inline-flex items-center gap-2 text-base font-semibold text-slate-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sky-300">
              <TrainFront className="h-5 w-5" />
            </span>
            SMARTTRANSIT
          </Link>

          <div className="my-auto py-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
              <Route className="h-3.5 w-3.5" />
              Passenger Access
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-100">Welcome back</h2>
            <p className="mt-3 text-sm text-slate-400">
              Sign in to view active tickets, travel history, and live bus tracking updates.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
                Live Route Preview
              </div>
              <div className="relative pl-5">
                <div className="absolute bottom-2 left-1.75 top-2 w-px bg-slate-800" aria-hidden="true" />
                {['Ecoland Terminal', 'Matina Crossing', 'Davao City Hall', 'Bajada Junction'].map((stop, index) => (
                  <div key={stop} className="relative mb-4 flex items-center gap-3 last:mb-0">
                    <span
                      className={`absolute -left-5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border ${
                        index === 2
                          ? 'border-sky-400 bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.25)]'
                          : 'border-slate-600 bg-slate-950'
                      }`}
                      aria-hidden="true"
                    />
                    <span className={`${index === 2 ? 'text-slate-100' : 'text-slate-400'} text-sm`}>{stop}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-8">
          {/* ── OTP verification screen ──────────────────────────────────── */}
          {otpRequired ? (
            <>
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-800 bg-sky-950/50 text-sky-400">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Verify your identity</h1>
                  <p className="mt-0.5 text-sm text-slate-500">
                    A 6-digit code was sent to <span className="font-medium text-slate-300">{otpEmailMasked}</span>
                  </p>
                </div>
              </div>

              {otpError && (
                <div className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
                  <TriangleAlert className="h-4 w-4" />
                  {otpError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleVerifyOtp} noValidate>
                <label className="block text-sm font-medium text-slate-300" htmlFor="otp-input">
                  Verification Code
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="mt-1 h-14 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-center font-mono text-2xl font-bold tracking-[0.6em] text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Verifying...
                    </>
                  ) : (
                    'Confirm Code'
                  )}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-sky-400 transition hover:text-sky-300 disabled:opacity-50"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={cancelOtp}
                  className="hover:text-slate-300"
                >
                  ← Back to login
                </button>
              </div>
            </>
          ) : (
            /* ── Credentials screen ──────────────────────────────────────── */
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-100">Sign In</h1>
                <p className="mt-1 text-sm text-slate-500">Enter your credentials to access your dashboard.</p>
              </div>

              {error && (
                <div className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
                  <TriangleAlert className="h-4 w-4" />
                  {error}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit} noValidate id="login-form">
                <label className="block text-sm font-medium text-slate-300" htmlFor="login-email">
                  Email Address
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                    <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="juan@example.com"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email}</span>}
                </label>

                <label className="block text-sm font-medium text-slate-300" htmlFor="login-password">
                  <span className="mb-1 flex items-center justify-between">
                    Password
                    <a href="#" className="text-xs text-sky-400 hover:text-sky-300" id="forgot-password-link">Forgot password?</a>
                  </span>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                    <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={e => update('password', e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="text-slate-500 transition hover:text-slate-300"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password}</span>}
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-400" htmlFor="login-remember">
                  <input
                    id="login-remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  Remember me for 30 days
                </label>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  id="login-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Sending code...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link to="/passenger/signup" className="font-medium text-sky-400 hover:text-sky-300" id="switch-to-signup">Create one free</Link>
              </p>

              <p className="mt-4 text-center">
                <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-300" id="back-to-home">
                  <MoveLeft className="h-4 w-4" />
                  Back to Home
                </Link>
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}


