import { LogOut } from 'lucide-react';
import Card from '../ui/Card';

/** Sign out. The portal passes the one function it already uses to end the session. */
export default function AccountActionsSection({ onSignOut }) {
  return (
    <Card as="section" aria-labelledby="profile-actions-title" padding="md" data-testid="profile-actions">
      <h3 id="profile-actions-title" className="font-display text-base font-semibold text-navy-950">Account actions</h3>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <LogOut size={16} aria-hidden="true" /> Sign out
      </button>
    </Card>
  );
}
