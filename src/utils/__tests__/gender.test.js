import { describe, expect, it } from 'vitest';
import { GENDER_OPTIONS, genderLabel } from '../gender';
import { buildProfileView } from '../accountProfile';

describe('gender', () => {
  it('offers male, female and prefer not to say, like the server', () => {
    expect(GENDER_OPTIONS.map((option) => option.value)).toEqual(['male', 'female', 'prefer_not_to_say']);
  });

  it('labels a stored value, and gives nothing for one not given', () => {
    expect(genderLabel('prefer_not_to_say')).toBe('Prefer not to say');
    expect(genderLabel(null)).toBeNull();
  });

  it('shows the gender on the person\'s own profile, for passengers and staff', () => {
    expect(buildProfileView('passenger', { gender: 'female' }).gender).toBe('Female');
    expect(buildProfileView('driver', { gender: 'male' }).gender).toBe('Male');
    expect(buildProfileView('conductor', {}).gender).toBeNull();
  });
});
