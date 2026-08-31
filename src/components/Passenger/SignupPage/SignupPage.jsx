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
    <div className="min-h-screen bg-slate-50 flex flex-col lg:grid lg:grid-cols-[1fr_1fr]">
      {/* Left Side: Branding */}
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
              <Shield className="h-3.5 w-3.5" />
              Passenger Registration
            </span>
            <h1 className="font-display text-4xl leading-tight">
              Join SmartTransit
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Register once to unlock real-time trip tracking, e-tickets, and travel history.
            </p>
          </div>
        </div>

        {/* Step indicator on left side */}
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Registration Steps
          </p>
          {[
            { num: 1, label: 'Personal Information', desc: 'Your name, email and contact' },
            { num: 2, label: 'Account Security', desc: 'Set a strong password' },
          ].map(({ num, label, desc }) => (
            <div key={num} className={`flex items-center gap-3 ${step >= num ? 'opacity-100' : 'opacity-40'}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${step >= num ? 'bg-teal-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {step > num ? <Check className="h-4 w-4" /> : num}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-100">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} SmartTransit. Davao Region XI.
        </p>
      </div>

      {/* Right Side: Form */}
      <div className="flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <TrainFront className="h-6 w-6 text-teal-600" />
              <span className="font-display text-slate-900">SmartTransit</span>
            </Link>
          </div>

          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              <Shield className="h-3.5 w-3.5" />
              {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
            </span>
            <h2 className="font-display text-3xl text-slate-950 mt-4">
              {step === 1 ? 'Personal Information' : 'Account Security'}
            </h2>
            <p className="text-slate-600 mt-2 text-sm">
              {step === 1
                ? 'Fill in your passenger details to continue.'
                : 'Set a strong password and complete registration.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <TriangleAlert className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Check className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-900">{success}</p>
            </div>
          )}

          {step === 1 && (
            <form className="space-y-4" onSubmit={handleStep1} noValidate id="signup-step1-form">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-firstName">First Name</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                    <UserRound className="h-4 w-4 text-slate-400 shrink-0" />
                    <input id="signup-firstName" type="text" className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="Juan" value={form.firstName} onChange={e => update('firstName', e.target.value)} autoComplete="given-name" />
                  </div>
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-lastName">Last Name</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                    <UserRound className="h-4 w-4 text-slate-400 shrink-0" />
                    <input id="signup-lastName" type="text" className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="Dela Cruz" value={form.lastName} onChange={e => update('lastName', e.target.value)} autoComplete="family-name" />
                  </div>
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-email">Email Address</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <input id="signup-email" type="email" className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="juan@example.com" value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-phone">Phone</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <input id="signup-phone" type="tel" className="font-data h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="+63 9XX XXX XXXX" value={form.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-dob">Date of Birth</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <input id="signup-dob" type="date" className="font-data h-11 w-full bg-transparent text-sm text-slate-900 outline-none cursor-text pointer-events-auto" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  </div>
                  {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-address">
                  Address <span className="text-xs text-slate-400">(optional)</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <input id="signup-address" type="text" className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="123 Rizal St, Davao City" value={form.address} onChange={e => update('address', e.target.value)} autoComplete="street-address" />
                </div>
              </div>

              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700" id="signup-next-btn">
                Continue to Security
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate id="signup-step2-form">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-password">Password</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                  <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                  <input id="signup-password" type={showPassword ? 'text' : 'password'} className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="Create a strong password" value={form.password} onChange={e => update('password', e.target.value)} autoComplete="new-password" />
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
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
                        <div key={i} className="h-1.5 rounded" style={{ background: i <= strength ? si.color : '#e2e8f0' }} />
                      ))}
                    </div>
                  </div>
                )}
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1.5" htmlFor="signup-confirm">Confirm Password</label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent pointer-events-auto cursor-text">
                  <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                  <input id="signup-confirm" type={showConfirm ? 'text' : 'password'} className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto" placeholder="Repeat your password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} autoComplete="new-password" />
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {passwordHints.map((hint) => (
                  <div key={hint.label} className={`inline-flex items-center gap-2 text-xs ${hint.check ? 'text-teal-600' : 'text-slate-400'}`}>
                    <Check className="h-3.5 w-3.5" />
                    {hint.label}
                  </div>
                ))}
              </div>

              <label className="inline-flex cursor-pointer items-start gap-2 text-sm text-slate-600" htmlFor="signup-terms">
                <input id="signup-terms" type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" checked={form.agreeTerms} onChange={e => update('agreeTerms', e.target.checked)} />
                <span>
                  I agree to the <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">Terms of Service</a> and{' '}
                  <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">Privacy Policy</a>.
                </span>
              </label>
              {errors.agreeTerms && <p className="-mt-2 text-xs text-red-600">{errors.agreeTerms}</p>}

              <div className="flex gap-3">
                <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setStep(1)} id="signup-back-btn">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} id="signup-submit-btn">
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

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/passenger/login" className="font-semibold text-teal-600 hover:text-teal-700" id="switch-to-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
