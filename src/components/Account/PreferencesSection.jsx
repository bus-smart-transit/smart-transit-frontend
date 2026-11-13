import Card from '../ui/Card';
import Toggle from '../ui/Toggle';
import { formatPhone } from '../../utils/phone';

/**
 * Preferences that already work: a Driver's or Chauffeur's availability (`availability` = { value, saving,
 * onChange(next) }) and, for everyone, Batch 67's text messages (`textMessages` = { value, saving, message, phone,
 * onChange(next) }). A control without its handler is not shown (no controls that do nothing).
 */
export default function PreferencesSection({ availability = null, textMessages = null }) {
  const showAvailability = availability && typeof availability.value === 'boolean';
  const showTexts = textMessages && typeof textMessages.value === 'boolean';
  if (!showAvailability && !showTexts) return null;
  const phone = showTexts && textMessages.phone ? formatPhone(textMessages.phone) : null;

  return (
    <Card as="section" aria-labelledby="profile-preferences-title" padding="md" data-testid="profile-preferences">
      <h3 id="profile-preferences-title" className="font-display text-base font-semibold text-navy-950">Preferences</h3>
      {showAvailability && (
        <Toggle
          checked={availability.value}
          onChange={availability.onChange}
          disabled={Boolean(availability.saving)}
          label="Available for assignments"
          description="Turn this off when you cannot take new trips. Your operator can see it."
        />
      )}
      {showTexts && (
        <div data-testid="text-messages-preference">
          <Toggle
            checked={textMessages.value}
            onChange={textMessages.onChange}
            disabled={Boolean(textMessages.saving) || (!phone && !textMessages.value)}
            label="Send me text messages"
            description={phone
              ? `Login codes and updates about your trips and schedules, by text to ${phone}. Off until you turn it on.`
              : 'Add a mobile number to your profile to get text messages.'}
          />
          {textMessages.message && <p role="status" className="text-xs text-slate-600">{textMessages.message}</p>}
        </div>
      )}
    </Card>
  );
}
