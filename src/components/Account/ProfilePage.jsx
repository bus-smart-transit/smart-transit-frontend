import { buildProfileView } from '../../utils/accountProfile';
import Card from '../ui/Card';
import ProfileOverview from './ProfileOverview';
import PersonalInfoSection from './PersonalInfoSection';
import RoleInfoSection from './RoleInfoSection';
import SecuritySection from './SecuritySection';
import ChangePasswordSection from './ChangePasswordSection';
import PreferencesSection from './PreferencesSection';
import AccountActionsSection from './AccountActionsSection';
import DeleteAccountSection from './DeleteAccountSection';

/**
 * Batch 36: the one Profile page for every portal. The role decides which fields and sections appear; the portal
 * passes the profile it already loaded and the handlers it already has. There is no second page per role.
 *
 *   role          'passenger' | 'driver' | 'conductor' | 'operator'
 *   profile       the profile object the portal loaded (null while loading)
 *   loading       true while it loads
 *   error         a plain message when it could not be loaded
 *   onRetry       called by "Try again"
 *   twoFactor     { enabled, saving, message, onChange(enabled) } (omit for a role that cannot switch it)
 *   availability  { value, saving, onChange(next) } (Driver and Chauffeur)
 *   assignment    { route, fleet } for today (Driver and Chauffeur)
 *   onSignOut     ends the session
 *   onDeleteAccount  2026-11-05: passengers only; deletes their own account (DeleteAccountSection)
 */
export default function ProfilePage({ role, profile, loading = false, error = '', onRetry, twoFactor = null, availability = null, assignment = null, onSignOut, onSaveProfile = null, onDeleteAccount = null }) {
  if (loading && !profile) {
    return (
      <div role="status" aria-label="Loading your profile" data-testid="profile-loading" className="max-w-3xl space-y-4">
        {[0, 1, 2].map((i) => <Card key={i} padding="md" className="animate-pulse"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="mt-4 h-3 w-2/3 rounded bg-slate-100" /></Card>)}
      </div>
    );
  }

  if (!profile) {
    return (
      <Card padding="md" className="max-w-3xl" data-testid="profile-error">
        <p role="alert" className="text-sm text-slate-700">{error || 'We could not load your profile. Please try again.'}</p>
        {onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">Try again</button>}
      </Card>
    );
  }

  const view = buildProfileView(role, profile);
  return (
    <div className="max-w-3xl space-y-4" data-testid="profile-page">
      <ProfileOverview view={view} />
      {/* 2026-10-29: passengers can edit their name, phone and gender (onSaveProfile); staff stay read-only. */}
      <PersonalInfoSection view={view} profile={profile} onSave={role === 'passenger' ? onSaveProfile : null} />
      <RoleInfoSection view={view} assignment={assignment} />
      <SecuritySection view={view} twoFactor={twoFactor} />
      {/* Batch 46: staff change their own password here (passengers use "Forgot password" on the sign-in page). */}
      {['driver', 'conductor', 'operator'].includes(role) && <ChangePasswordSection />}
      <PreferencesSection availability={availability} />
      <AccountActionsSection onSignOut={onSignOut} />
      {role === 'passenger' && onDeleteAccount && <DeleteAccountSection onDelete={onDeleteAccount} />}
    </div>
  );
}
