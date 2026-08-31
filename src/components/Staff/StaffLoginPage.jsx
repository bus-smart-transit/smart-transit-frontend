import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Bus,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Mail,
  Shield,
  Ticket,
  TriangleAlert,
  Users,
} from 'lucide-react';
import StaffService from '../../api/StaffService/StaffService';
import { TokenManager } from '../../utils/TokenManager.js';

const ROLES = [
  { value: 'driver', label: 'Driver', icon: Bus, desc: 'Manage trips and route navigation' },
  { value: 'conductor', label: 'Conductor', icon: Ticket, desc: 'Handle ticket validation and occupancy' },
  { value: 'operator', label: 'Operator', icon: Users, desc: 'Monitor fleets, schedules, and reports' },
];

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const otpRefs = useRef([]);
  const [selectedRole, setSelectedRole] = useState('driver');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpUserId, setOtpUserId] = useState(null);
  const [otpEmailMasked, setOtpEmailMasked] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!otpRequired || otpExpiresIn <= 0) return;
    const timer = setInterval(() => {
      setOtpExpiresIn((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpRequired, otpExpiresIn]);

  useEffect(() => {
    if (!otpRequired || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpRequired, resendCooldown]);

  const update = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
    setError('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const res = await StaffService.login({ email: form.email, password: form.password });
      const data = res?.data;

      if (data?.otp_required) {
        setOtpUserId(data.user_id);
        setOtpEmailMasked(data.email_masked ?? 'your email');
        setOtpExpiresIn(Number(data.otp_expires_in_seconds ?? 180));
        setResendCooldown(30);
        setOtp('');
        setOtpError(data.otp_delivery_failed ? (data.otp_delivery_message || 'OTP email delivery failed.') : '');
        setOtpRequired(true);
      } else {
        const token = data?.token;
        const role = data?.user?.role;
        if (!token) throw new Error('No token received');

        const resolvedRole = role || selectedRole;

        TokenManager.clearStaffSession();
        TokenManager.setStaffSession(token, resolvedRole);

        navigate(`/employee/${resolvedRole}/dashboard`);
      }
    } catch (err) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (eventOrCode) => {
    if (typeof eventOrCode !== 'string') {
      eventOrCode?.preventDefault?.();
    }

    const source = typeof eventOrCode === 'string' ? eventOrCode : otp;
    const cleaned = source.trim();
    if (cleaned.length !== 6 || !/^\d{6}$/.test(cleaned)) {
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    try {
      const res = await StaffService.verifyOtp(otpUserId, cleaned);
      const token = res?.data?.token;
      const role = res?.data?.user?.role;
      if (!token) throw new Error('Token missing after OTP verification.');

      const resolvedRole = role || selectedRole;
      TokenManager.setStaffSession(token, resolvedRole);
      navigate(`/employee/${resolvedRole}/dashboard`);
    } catch (err) {
      setOtpError(err?.message || 'Incorrect or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setOtpError('');
    setOtp('');
    try {
      const res = await StaffService.login({ email: form.email, password: form.password });
      const data = res?.data;
      if (data?.otp_required) {
        setOtpEmailMasked(data.email_masked ?? otpEmailMasked);
        setOtpExpiresIn(Number(data.otp_expires_in_seconds ?? 180));
        setOtpError(data.otp_delivery_failed ? (data.otp_delivery_message || 'OTP email delivery failed.') : '');
      }
      setResendCooldown(30);
    } catch {
      // Keep OTP screen open and allow manual retry.
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOtp = () => {
    setOtpRequired(false);
    setOtpUserId(null);
    setOtpEmailMasked('');
    setOtp('');
    setOtpError('');
    setOtpExpiresIn(0);
    setResendCooldown(0);
  };

  const otpDigits = Array.from({ length: 6 }, (_, index) => otp[index] ?? '');
  const ttlMinutes = String(Math.floor(otpExpiresIn / 60)).padStart(2, '0');
  const ttlSeconds = String(otpExpiresIn % 60).padStart(2, '0');

  const commitOtpDigit = (index, value) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = otpDigits.slice();
    next[index] = cleaned;
    const combined = next.join('');
    setOtp(combined);

    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (combined.length === 6 && !next.includes('')) {
      void handleVerifyOtp(combined);
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    setOtp(pasted);
    otpRefs.current[Math.min(5, Math.max(0, pasted.length - 1))]?.focus();
    if (pasted.length === 6) {
      void handleVerifyOtp(pasted);
    }
  };

  const activeRole = ROLES.find((r) => r.value === selectedRole);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:grid lg:grid-cols-[1fr_1.2fr]">
      {/* Left panel â€” dark navy branding */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#0D1B2A] px-8 py-12 text-white">
        <div className="flex flex-col items-center text-center gap-5 max-w-xs">
          {/* Bus icon */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#142333] border border-white/10">
            <Bus className="h-14 w-14 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide">SMARTTRANSIT</h1>
            <p className="mt-1 text-base text-slate-400">{activeRole?.label ?? 'Staff'} Portal</p>
          </div>
          <p className="text-sm text-slate-400 italic">Drive Smart. Ride Safe.</p>
        </div>
      </div>

      {/* Right panel â€” form */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-white lg:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1B2A]">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 leading-none">SMARTTRANSIT</p>
              <p className="text-xs text-slate-500">{activeRole?.label ?? 'Staff'} Portal</p>
            </div>
          </div>

          {!otpRequired ? (
            <>
              <div className="mb-8">
                <h2 className="font-display text-3xl font-bold text-slate-900">Welcome Back!</h2>
                <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your account</p>
              </div>

              {/* Role selector (compact) */}
              <div className="mb-6 flex gap-2">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const active = role.value === selectedRole;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                        active
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {role.label}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <TriangleAlert className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email / Driver ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="staff-email">
                    Email or Driver ID
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition pointer-events-auto">
                    <IdCard className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      id="staff-email"
                      type="email"
                      className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto"
                      placeholder="Enter your email or driver ID"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      autoFocus
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="staff-password">
                    Password
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition pointer-events-auto">
                    <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 cursor-text pointer-events-auto"
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 transition"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>

                {/* Remember me + Forgot */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                    Remember me
                  </label>
                  <a href="#" className="text-teal-600 hover:text-teal-700 font-medium">Forgot password?</a>
                </div>

                {/* Test credentials hint */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Test: </span>
                  {selectedRole}@smarttransit.com / password123
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#0D1B2A] py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-400">
                By continuing, you agree to the{' '}
                <a href="#" className="text-teal-600 hover:underline">Terms and Conditions</a>.
              </p>
            </>
          ) : (
            /* OTP verification */
            <>
              <div className="mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 mb-4">
                  <Shield className="h-6 w-6 text-teal-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">Verify your identity</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  A 6-digit code was sent to <strong>{otpEmailMasked}</strong>
                </p>
                <p className="mt-1 text-xs text-slate-400">Code expires in {ttlMinutes}:{ttlSeconds}</p>
              </div>

              {otpError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <TriangleAlert className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{otpError}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Verification Code</label>
                  <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={`staff-otp-box-${index}`}
                        id={`staff-otp-box-${index}`}
                        ref={(node) => { otpRefs.current[index] = node; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => commitOtpDigit(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        className="h-12 rounded-lg border-2 border-slate-200 text-center text-lg font-bold text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        autoFocus={index === 0}
                        aria-label={`OTP digit ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#0D1B2A] py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Verifying...
                    </span>
                  ) : 'Confirm Code'}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading || resendCooldown > 0}
                  className="text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
                <button type="button" onClick={cancelOtp} className="text-slate-500 hover:text-slate-700">
                  â† Back to login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
