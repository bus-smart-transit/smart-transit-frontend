import { useState } from 'react';
import { takeAccountDeletionNotice } from '../../utils/accountDeletionNotice';

/**
 * 2026-11-05: shows, once, that the passenger's account will be deleted (home page) or that signing in kept it (home
 * page or dashboard). The hooks leave the notice with leaveAccountDeletionNotice (utils/accountDeletionNotice.js).
 */
export default function AccountDeletionNotice() {
  const [notice] = useState(takeAccountDeletionNotice);

  if (notice?.cancelled) {
    return (
      <div role="status" data-testid="account-deletion-cancelled" className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        Welcome back. Your account will not be deleted.
      </div>
    );
  }

  if (notice && 'deletesOn' in notice) {
    return (
      <div role="status" data-testid="account-deletion-notice" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
        Your account will be deleted{notice.deletesOn ? ` on ${notice.deletesOn}` : ''}. We signed you out on every device. Changed your mind? Sign in again before then.
      </div>
    );
  }

  return null;
}
