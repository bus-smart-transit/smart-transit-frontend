import { Shield } from 'lucide-react';
import Card from '../ui/Card';
import Toggle from '../ui/Toggle';

/**
 * The extra login code. A person who may switch it can; an Operator's is always on, so it is shown as a fact, not a
 * switch. `twoFactor` is { enabled, saving, message, onChange(enabled) }; without it the card is not shown.
 */
export default function SecuritySection({ view, twoFactor = null }) {
  if (!twoFactor && !view.twoFactorRequired) return null;
  return (
    <Card as="section" aria-labelledby="profile-security-title" padding="md" data-testid="profile-security">
      <h3 id="profile-security-title" className="font-display text-base font-semibold text-navy-950">Account security</h3>
      {view.twoFactorRequired ? (
        <div className="mt-3 flex items-start gap-3">
          <Shield aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-navy-950">Extra login code</p>
            <p className="text-xs text-slate-500">Every sign-in for this account needs a one-time code sent to your email. It cannot be turned off.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Always on</span>
        </div>
      ) : (
        <>
          <Toggle
            checked={Boolean(twoFactor.enabled)}
            onChange={twoFactor.onChange}
            disabled={Boolean(twoFactor.saving)}
            label="Extra login code"
            description="When this is on, you enter a one-time code sent to your email each time you sign in."
          />
          {twoFactor.message && <p role="status" className="mt-2 text-xs font-medium text-teal-700">{twoFactor.message}</p>}
        </>
      )}
    </Card>
  );
}
