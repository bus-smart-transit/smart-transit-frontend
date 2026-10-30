import { formatManilaDate } from './dates';
import { genderLabel } from './gender';

// Batch 36: what the one shared Profile page shows, worked out from the profile each portal already loads. Nothing is
// invented here: a value the server did not send is null, and the page says "Not provided". The role names are the
// stored ones; "conductor" is displayed as Chauffeur.

export const NOT_PROVIDED = 'Not provided';

export const ROLE_LABELS = { passenger: 'Passenger', driver: 'Driver', conductor: 'Chauffeur', operator: 'Operator' };

// Who a person asks to change a locked detail. Kept in one place so the rule is easy to change.
export const STAFF_CHANGE_NOTE = {
  driver: 'To change these details, contact your operator.',
  conductor: 'To change these details, contact your operator.',
  operator: 'To change these details, contact your system administrator.',
};

const clean = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const pointsLabel = (value) => {
  const number = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isFinite(number)) return null;
  return `${number.toLocaleString('en-PH', { maximumFractionDigits: 2 })} ${number === 1 ? 'point' : 'points'}`;
};

/** The short reference a person can read out: the first 8 characters of their account uuid. */
const accountReference = (uuid) => {
  const text = clean(uuid);
  return text ? text.replace(/-/g, '').slice(0, 8).toUpperCase() : null;
};

/**
 * @param {'passenger'|'driver'|'conductor'|'operator'} role
 * @param {object|null} raw the profile as the portal already loaded it (flat fields plus a nested `user`)
 */
export function buildProfileView(role, raw) {
  const profile = raw ?? {};
  const user = profile.user ?? {};
  const staff = role !== 'passenger';

  const idLabel = role === 'passenger' ? 'Passenger ID' : role === 'operator' ? 'Company ID' : 'Staff ID';
  // 2026-10-30: staff show their company_user_uuid reference too, never the numeric company_user_id.
  const idValue = accountReference(role === 'passenger' ? profile.passenger_uuid : profile.company_user_uuid);
  const identification = { label: idLabel, value: idValue };

  const joined = clean(user.created_at) ?? clean(profile.created_at);

  return {
    role,
    roleLabel: ROLE_LABELS[role] ?? clean(role),
    name: clean(profile.name) ?? clean(user.name),
    email: clean(user.email) ?? clean(profile.email),
    phone: clean(profile.phone_num),
    gender: genderLabel(profile.gender),
    // A passenger's own address is shown to them. A staff member's address and birth date are not shown.
    address: staff ? null : clean(profile.address),
    identification,
    rewardPoints: role === 'passenger' ? pointsLabel(profile.reward_points) : null,
    createdOn: joined ? formatManilaDate(joined.slice(0, 10)) || null : null,
    twoFactorEnabled: Boolean(user.two_factor_enabled ?? profile.two_factor_enabled),
    twoFactorRequired: role === 'operator',
    available: ['driver', 'conductor'].includes(role) && typeof profile.is_available === 'boolean' ? profile.is_available : null,
    lockedNote: staff ? STAFF_CHANGE_NOTE[role] ?? null : null,
  };
}
