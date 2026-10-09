import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Route, TrainFront, TriangleAlert } from 'lucide-react';
import PassengerService from '../../../api/PassengerService/PassengerService';
import { useResetLink } from '../../../api/hooks/useResetLink';
import Button from '../../ui/Button';
import FormInput from '../../ui/FormInput';
import Card from '../../ui/Card';

export default function ResetPasswordPage() {
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
      await PassengerService.resetPassword({
        token,
        email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      navigate('/passenger/login', {
        replace: true,
        state: { notice: 'Password updated. Sign in with your new password.' },
      });
    } catch (err) {
      setError(err?.message || 'Unable to reset password. Please request a new link.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50 flex flex-col lg:grid lg:grid-cols-[1fr_1fr]">
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
              Passenger Security
            </span>
            <h1 className="font-display text-4xl leading-tight">Set a new password</h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Choose a new password to recover access to your account.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">Keep your password private and do not share reset links.</p>
      </div>

      <div className="flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <TrainFront className="h-6 w-6 text-teal-600" />
              <span className="font-display text-slate-900">SmartTransit</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl text-slate-950">Reset password</h2>
            <p className="text-slate-600 mt-2 text-sm">
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

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={isLoading} disabled={isLoading}>
              Update Password
            </Button>
          </form>
          )}

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/passenger/login" className="text-teal-700 hover:text-teal-800 font-medium">
              Back to sign in
            </Link>
            <Link to="/passenger/forgot-password" className="text-slate-600 hover:text-slate-800">
              Need a reset link?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
