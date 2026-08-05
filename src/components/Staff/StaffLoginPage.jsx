import { useState } from 'react';
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

const ROLES = [
  { value: 'driver', label: 'Driver', icon: Bus, desc: 'Manage trips and route navigation' },
  { value: 'conductor', label: 'Conductor', icon: Ticket, desc: 'Handle ticket validation and occupancy' },
  { value: 'operator', label: 'Operator', icon: Users, desc: 'Monitor fleets, schedules, and reports' },
];

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('driver');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const token = res?.data?.token;
      const role = res?.data?.user?.role;

      if (!token) throw new Error('No token received');

      const resolvedRole = role || selectedRole;

      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_role');
      sessionStorage.removeItem('staff_token');
      sessionStorage.removeItem('staff_role');

      sessionStorage.setItem('staff_token', token);
      sessionStorage.setItem('staff_role', resolvedRole);
      localStorage.setItem('staff_token', token);
      localStorage.setItem('staff_role', resolvedRole);

      navigate(`/employee/${resolvedRole}/dashboard`);
    } catch (err) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeRole = ROLES.find((r) => r.value === selectedRole);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-200 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col border-b border-slate-800 bg-slate-950/70 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <Link to="/" className="inline-flex items-center gap-2 text-base font-semibold text-slate-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-sky-300">
              <Bus className="h-5 w-5" />
            </span>
            BUS OPERATOR PORTAL
          </Link>

          <div className="my-auto py-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
              <Shield className="h-3.5 w-3.5" />
              Fleet Management Access
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-100">Secure Staff Login</h2>
            <p className="mt-3 text-sm text-slate-400">
              Sign in with your operator-assigned credentials to access role-specific transit controls.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Choose role</p>
              <div className="space-y-2">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const active = role.value === selectedRole;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? 'border-sky-400 bg-sky-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${active ? 'border-sky-400/50 bg-sky-500/20 text-sky-300' : 'border-slate-700 text-slate-500'}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${active ? 'text-slate-100' : 'text-slate-300'}`}>{role.label}</p>
                          <p className="text-xs text-slate-500">{role.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Link to="/passenger/login" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300">
            <ArrowLeft className="h-4 w-4" />
            Passenger Login
          </Link>
        </section>

        <section className="p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-100">Sign In as {activeRole?.label}</h1>
            <p className="mt-1 text-sm text-slate-500">Use your company credentials to continue.</p>
          </div>

          {error && (
            <div className="mb-4 inline-flex w-full items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
              <TriangleAlert className="h-4 w-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-300">
              Bus Operator ID
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                <IdCard className="h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder={`${selectedRole}@smarttransit.com`}
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  autoFocus
                />
              </div>
              {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email}</span>}
            </label>

            <label className="block text-sm font-medium text-slate-300">
              Password
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 focus-within:border-sky-400">
                <KeyRound className="h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
                <button
                  type="button"
                  className="text-slate-500 transition hover:text-slate-300"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password}</span>}
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
              <p className="mb-1 inline-flex items-center gap-1 font-semibold text-slate-300">
                <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />
                Test Credentials
              </p>
              <p className="font-data inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                {selectedRole}@smarttransit.com
              </p>
              <p className="font-data mt-1">password123</p>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                `Sign In as ${activeRole?.label}`
              )}
            </button>
          </form>

          <p className="mt-4 text-right text-sm">
            <a href="#" className="text-sky-400 hover:text-sky-300">Contact Dispatcher</a>
          </p>
        </section>
      </div>
    </div>
  );
}
