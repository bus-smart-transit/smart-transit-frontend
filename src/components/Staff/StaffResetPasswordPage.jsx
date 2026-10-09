import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Lock, Shield, TriangleAlert } from 'lucide-react';
import StaffService from '../../api/StaffService/StaffBaseService';
import { useResetLink } from '../../api/hooks/useResetLink';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import Card from '../ui/Card';

export default function StaffResetPasswordPage() {
  const navigate = useNavigate();
  const { token, email } = useResetLink();
  const hasLink = Boolean(token && email);

  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.password || !form.password_confirmation) {
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
      await StaffService.resetPassword({
        token,
        email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      navigate('/employee/login', {
        replace: true,
        state: { notice: 'Password updated. Sign in with your new password.' },
      });
    } catch (err) {
      setError(err?.message || 'Unable to reset password. Please request a new link.');
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
          <p className="text-sm text-slate-400">Set a new password for your staff account.</p>
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
            <p className="mt-1.5 text-sm text-slate-500">
              {hasLink ? `Choose a new password for ${email}.` : 'Open the reset link from your email to continue.'}
            </p>
          </div>

          {!hasLink && (
            <Card className="bg-amber-50 border-amber-200 p-4 flex items-start gap-3">
              <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-amber-900">
                This reset link is incomplete or has already been opened. Use the link in your email again, or request a new one.
              </p>
            </Card>
          )}

          {hasLink && (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <Card className="bg-red-50 border-red-200 p-4 flex items-start gap-3">
                <TriangleAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900">{error}</p>
              </Card>
            )}

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
          )}

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
