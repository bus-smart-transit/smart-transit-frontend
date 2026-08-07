import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  TrainFront,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { useSignUp } from '../../../api/hooks/Passenger/signup';

export default function SignUpPage() {
  const {
    step,
    setStep,
    isLoading,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    error,
    success,
    form,
    errors,
    update,
    handleStep1,
    handleSubmit,
    strength,
    si,
  } = useSignUp();

  const passwordHints = [
    { check: form.password.length >= 8, label: 'At least 8 characters' },
    { check: /[A-Z]/.test(form.password), label: 'One uppercase letter' },
    { check: /[a-z]/.test(form.password), label: 'One lowercase letter' },
    { check: /\d/.test(form.password), label: 'One number' },
  ];

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
              <Shield className="h-3.5 w-3.5" />
              Passenger Registration
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-100">Create your account</h2>
            <p className="mt-3 text-sm text-slate-400">
              Register once to unlock real-time trip tracking, e-tickets, and travel history.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="relative flex items-center gap-4 pl-3">
                <div className="absolute left-4 top-1/2 h-px w-24 -translate-y-1/2 bg-slate-800" aria-hidden="true" />
                <div className="relative z-10 flex items-center gap-2 rounded-full bg-slate-900 pr-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${step >= 1 ? 'border-sky-400 bg-sky-400 text-slate-950' : 'border-slate-700 text-slate-500'}`}
                  >
                    1
                  </span>
                  <span className="text-xs text-slate-400">Info</span>
                </div>
                <div className="relative z-10 flex items-center gap-2 rounded-full bg-slate-900 pr-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${step >= 2 ? 'border-sky-400 bg-sky-400 text-slate-950' : 'border-slate-700 text-slate-500'}`}
                  >
                    2
                  </span>
                  <span className="text-xs text-slate-400">Security</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-100">
              {step === 1 ? 'Personal Information' : 'Account Security'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === 1
                ? 'Fill in your passenger details to continue.'
                : 'Set a strong password and complete registration.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
              <TriangleAlert className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300" role="status">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}

          {step === 1 && (
            <form className="space-y-4" onSubmit={handleStep1} noValidate id="signup-step1-form">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-300" htmlFor="signup-firstName">
                  First Name
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                    <UserRound className="h-4 w-4 text-slate-500" />
                    <input
                      id="signup-firstName"
                      type="text"
                      className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="Juan"
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  {errors.firstName && <span className="mt-1 block text-xs text-red-400">{errors.firstName}</span>}
                </label>

                <label className="block text-sm font-medium text-slate-300" htmlFor="signup-lastName">
                  Last Name
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                    <UserRound className="h-4 w-4 text-slate-500" />
                    <input
                      id="signup-lastName"
                      type="text"
                      className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="Dela Cruz"
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                  {errors.lastName && <span className="mt-1 block text-xs text-red-400">{errors.lastName}</span>}
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-300" htmlFor="signup-email">
                Email Address
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <input
                    id="signup-email"
                    type="email"
                    className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="juan@example.com"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email}</span>}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-300" htmlFor="signup-phone">
                  Phone
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <input
                      id="signup-phone"
                      type="tel"
                      className="font-data h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      placeholder="+63 9XX XXX XXXX"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone && <span className="mt-1 block text-xs text-red-400">{errors.phone}</span>}
                </label>

                <label className="block text-sm font-medium text-slate-300" htmlFor="signup-dob">
                  Date of Birth
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <input
                      id="signup-dob"
                      type="date"
                      className="font-data h-11 w-full bg-transparent text-sm text-slate-100 outline-none"
                      value={form.dateOfBirth}
                      onChange={e => update('dateOfBirth', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  {errors.dateOfBirth && <span className="mt-1 block text-xs text-red-400">{errors.dateOfBirth}</span>}
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-300" htmlFor="signup-address">
                Address <span className="text-xs text-slate-500">(optional)</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <input
                    id="signup-address"
                    type="text"
                    className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="123 Rizal St, Davao City"
                    value={form.address}
                    onChange={e => update('address', e.target.value)}
                    autoComplete="street-address"
                  />
                </div>
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                id="signup-next-btn"
              >
                Continue to Security
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate id="signup-step2-form">
              <label className="block text-sm font-medium text-slate-300" htmlFor="signup-password">
                Password
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    autoComplete="new-password"
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
                {form.password && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Strength</span>
                      <span style={{ color: si.color }}>{si.label}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-1.5 rounded" style={{ background: i <= strength ? si.color : '#1e293b' }} />
                      ))}
                    </div>
                  </div>
                )}
                {errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password}</span>}
              </label>

              <label className="block text-sm font-medium text-slate-300" htmlFor="signup-confirm">
                Confirm Password
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <input
                    id="signup-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="text-slate-500 transition hover:text-slate-300"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="mt-1 block text-xs text-red-400">{errors.confirmPassword}</span>}
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                {passwordHints.map((hint) => (
                  <div key={hint.label} className={`inline-flex items-center gap-2 text-xs ${hint.check ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Check className="h-3.5 w-3.5" />
                    {hint.label}
                  </div>
                ))}
              </div>

              <label className="inline-flex cursor-pointer items-start gap-2 text-sm text-slate-400" htmlFor="signup-terms">
                <input
                  id="signup-terms"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                  checked={form.agreeTerms}
                  onChange={e => update('agreeTerms', e.target.checked)}
                />
                <span>
                  I agree to the <a href="#" className="text-sky-400 hover:text-sky-300">Terms of Service</a> and{' '}
                  <a href="#" className="text-sky-400 hover:text-sky-300">Privacy Policy</a>.
                </span>
              </label>
              {errors.agreeTerms && <span className="-mt-2 block text-xs text-red-400">{errors.agreeTerms}</span>}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                  onClick={() => setStep(1)}
                  id="signup-back-btn"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                  id="signup-submit-btn"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/passenger/login" className="font-medium text-sky-400 hover:text-sky-300" id="switch-to-login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
