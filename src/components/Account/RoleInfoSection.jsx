import Card from '../ui/Card';
import ReadOnlyField from './ReadOnlyField';

/**
 * Only what exists for the role, read-only: the identification number, a passenger's rewards, and a Driver's or
 * Chauffeur's fleet for today. `assignment` is { route, fleet } from data the portal already loaded, or null when the
 * portal has none to show.
 */
export default function RoleInfoSection({ view, assignment = null }) {
  const isCrew = view.role === 'driver' || view.role === 'conductor';
  return (
    <Card as="section" aria-labelledby="profile-role-title" padding="md" data-testid="profile-role-info">
      <h3 id="profile-role-title" className="font-display text-base font-semibold text-navy-950">{view.roleLabel} information</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {view.identification && <ReadOnlyField label={view.identification.label} value={view.identification.value} mono testId="field-identification" />}
        {view.role === 'passenger' && <ReadOnlyField label="Rewards balance" value={view.rewardPoints} testId="field-rewards" />}
        {isCrew && <ReadOnlyField label="Today's fleet" value={assignment?.fleet ?? null} mono emptyText="None today" testId="field-fleet" />}
        {isCrew && <ReadOnlyField label="Today's route" value={assignment?.route ?? null} emptyText="None today" testId="field-route" />}
      </dl>
    </Card>
  );
}
