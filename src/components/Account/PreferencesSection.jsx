import Card from '../ui/Card';
import Toggle from '../ui/Toggle';

/**
 * Preferences that already work. Today that is only a Driver's or Chauffeur's availability. `availability` is
 * { value, saving, onChange(next) }; without it the section is not shown (no controls that do nothing).
 */
export default function PreferencesSection({ availability = null }) {
  if (!availability || typeof availability.value !== 'boolean') return null;
  return (
    <Card as="section" aria-labelledby="profile-preferences-title" padding="md" data-testid="profile-preferences">
      <h3 id="profile-preferences-title" className="font-display text-base font-semibold text-navy-950">Preferences</h3>
      <Toggle
        checked={availability.value}
        onChange={availability.onChange}
        disabled={Boolean(availability.saving)}
        label="Available for assignments"
        description="Turn this off when you cannot take new trips. Your operator can see it."
      />
    </Card>
  );
}
