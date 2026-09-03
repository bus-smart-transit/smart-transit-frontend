import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Mail, Shield, TriangleAlert, CircleCheckBig } from 'lucide-react';
import StaffService from '../../api/StaffService/StaffService';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import Card from '../ui/Card';

export default function StaffForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await StaffService.forgotPassword({ email: email.trim() });
      setSuccess(response?.message || 'If that email is registered, a reset link has been sent.');
    } catch (err) {
      setError(err?.message || 'Unable to send reset link. Please try again.');
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
          <p className="text-sm text-slate-400">Recover access for driver, conductor, or operator accounts.</p>
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
            <h2 className="font-display text-3xl font-bold text-slate-900">Forgot password</h2>
            <p className="mt-1.5 text-sm text-slate-500">Enter your staff email to receive a reset link.</p>
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
              label="Staff Email"
              type="email"
              required
              placeholder="staff@smarttransit.com"
              icon={Mail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoading}
            />

            <Button type="submit" className="w-full bg-[#0D1B2A] hover:bg-slate-800" size="lg" loading={isLoading} disabled={isLoading}>
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/employee/login" className="text-teal-700 hover:text-teal-800 font-medium">
              Back to sign in
            </Link>
            <Link to="/employee/reset-password" className="text-slate-600 hover:text-slate-800">
              I have a token
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
