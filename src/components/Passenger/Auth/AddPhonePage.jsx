import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';
import PhoneInput from '../../ui/PhoneInput';
import Button from '../../ui/Button';
import { useAuth } from '../../../api/hooks/useAuth';
import { useAddPhone } from '../../../api/hooks/Passenger/useAddPhone';

/**
 * 2026-11-07: after signing up with Google, the passenger adds their mobile number (Google does not give it). The bus
 * company uses it to reach a passenger about a trip. Shown only to a signed-in passenger.
 */
export default function AddPhonePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const next = useLocation().state?.next || '/';
  const form = useAddPhone();

  if (!isLoading && !isAuthenticated) return <Navigate to="/passenger/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (await form.save()) navigate(next, { replace: true });
  };

  return (
    <AuthShell photoSide="right" title="Almost there." text="Add your mobile number so the bus company can reach you about your trip." tagline="It takes a few seconds.">
      <span className="inline-flex items-center rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-800">Your account is ready</span>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-950">Add your phone number</h1>
      <p className="mt-2 text-sm text-slate-500">You need it before you book a trip.</p>
      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <PhoneInput id="add-phone" label="Mobile number" callingCode={form.phone.callingCode} local={form.phone.local} onChange={form.setPhone} error={form.error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={form.saving} loading={form.saving}>Save and continue</Button>
      </form>
    </AuthShell>
  );
}
