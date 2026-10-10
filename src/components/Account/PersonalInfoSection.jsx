import Card from '../ui/Card';
import ReadOnlyField from './ReadOnlyField';

/** Name, email and phone (and a passenger's address). Phase 1 is read-only; the note says who can change them. */
export default function PersonalInfoSection({ view }) {
  return (
    <Card as="section" aria-labelledby="profile-personal-title" padding="md" data-testid="profile-personal">
      <h3 id="profile-personal-title" className="font-display text-base font-semibold text-navy-950">Personal information</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Name" value={view.name} testId="field-name" />
        <ReadOnlyField label="Email" value={view.email} testId="field-email" />
        <ReadOnlyField label="Phone" value={view.phone} mono testId="field-phone" />
        {view.role === 'passenger' && <ReadOnlyField label="Address" value={view.address} testId="field-address" />}
      </dl>
      {view.lockedNote && <p data-testid="locked-note" className="mt-3 text-xs text-slate-500">{view.lockedNote}</p>}
    </Card>
  );
}
