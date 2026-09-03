import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bus, KeyRound, Lock, Shield, TriangleAlert, CircleCheckBig } from 'lucide-react';
import StaffService from '../../api/StaffService/StaffService';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import Card from '../ui/Card';

export default function StaffResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [form, setForm] = useState({
    token: initialToken,
    email: initialEmail,
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.token.trim() || !form.email.trim() || !form.password || !form.password_confirmation) {
      setError('All fields are required.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.password_confirmation) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await StaffService.resetPassword({
        token: form.token.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setSuccess(response?.message || 'Password reset successfully. Please log in again.');
      setForm((prev) => ({ ...prev, password: '', password_confirmation: '' }));
    } catch (err) {
      setError(err?.message || 'Unable to reset password. Please request a new link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:grid lg:grid-cols-[1fr_1.2fr]">
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#0D1B2A] px-8 py-12 text-white">
        <div className="flex flex-col items-center text-center gap-5 max-w-xs">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[#142333] border border-white/10">
            <Shield className="h-12 w-12 text-teal-300" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide">SMARTTRANSIT</h1>
            <p className="mt-1 text-base text-slate-400">Staff Security</p>
          </div>
          <p className="text-sm text-slate-400">Use your reset token to set a new account password.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-white lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D1B2A]">
              <Bus className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-slate-900 leading-none">SMARTTRANSIT</p>
              <p className="text-xs text-slate-500">Staff Security</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-slate-900">Reset password</h2>
            <p className="mt-1.5 text-sm text-slate-500">Enter the token from email and your new password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <Card className="bg-red-50 border-red-200 p-4 flex items-start gap-3">
                <TriangleAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900">{error}</p>
              </Card>
            )}

            {success && (
              <Card className="bg-emerald-50 border-emerald-200 p-4 flex items-start gap-3">
                <CircleCheckBig className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-emerald-900">{success}</p>
              </Card>
            )}

            <FormInput
              label="Reset Token"
              type="text"
              required
              placeholder="Paste reset token"
              icon={KeyRound}
              value={form.token}
              onChange={(event) => update('token', event.target.value)}
              disabled={isLoading}
            />

            <FormInput
              label="Staff Email"
              type="email"
              required
              placeholder="staff@smarttransit.com"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              disabled={isLoading}
            />

            <FormInput
              label="New Password"
              type="password"
              required
              placeholder="Minimum 8 characters"
              icon={Lock}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              disabled={isLoading}
            />

            <FormInput
              label="Confirm New Password"
              type="password"
              required
              placeholder="Repeat new password"
              icon={Lock}
              value={form.password_confirmation}
              onChange={(event) => update('password_confirmation', event.target.value)}
              disabled={isLoading}
            />

            <Button type="submit" className="w-full bg-[#0D1B2A] hover:bg-slate-800" size="lg" loading={isLoading} disabled={isLoading}>
              Update Password
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/employee/login" className="text-teal-700 hover:text-teal-800 font-medium">
              Back to sign in
            </Link>
            <Link to="/employee/forgot-password" className="text-slate-600 hover:text-slate-800">
              Need a reset link?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
