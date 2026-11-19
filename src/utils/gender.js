/**
 * 2026-10-28: the optional gender choice (the same list as the server's App\Support\Gender). Empty means not given.
 */
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

/** "Female", or null when not given (the profile then reads "Not provided"). */
export function genderLabel(value) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? null;
}
