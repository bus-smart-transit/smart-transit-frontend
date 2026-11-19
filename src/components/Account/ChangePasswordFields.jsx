import PasswordField from '../ui/PasswordField';

/** Batch 46: the three password inputs of "Change password" (profile and first-sign-in offer share them). */
export default function ChangePasswordFields({ idPrefix, state }) {
  const { form, errors, update } = state;
  return (
    <div className="space-y-4">
      <PasswordField id={`${idPrefix}-current`} label="Current password" autoComplete="current-password" toggleLabel="current password" value={form.currentPassword} onChange={(value) => update('currentPassword', value)} error={errors.currentPassword} />
      <PasswordField id={`${idPrefix}-new`} label="New password" placeholder="Create a strong password" toggleLabel="new password" value={form.password} onChange={(value) => update('password', value)} error={errors.password} showStrength />
      <PasswordField id={`${idPrefix}-confirm`} label="Confirm new password" toggleLabel="confirm new password" value={form.passwordConfirmation} onChange={(value) => update('passwordConfirmation', value)} error={errors.passwordConfirmation} />
    </div>
  );
}
