// SmartPoints — SmartTransit's cashback-style loyalty program.
//
// The rules are intentionally simple (like Codashop Rewards):
//   - Earning:   ₱1 spent on a ticket = 1 SmartPoint
//   - Redeeming: 1 SmartPoint = ₱1 discount on a future ticket
//   - Minimum:   passengers need at least MIN_REDEMPTION_POINTS before
//                the "Use SmartPoints" option becomes available
//   - A discount can never take a ticket below ₱0

export const POINTS_PER_PESO_EARNED = 1;
export const PESO_PER_POINT_REDEEMED = 1;
export const MIN_REDEMPTION_POINTS = 100;

// How many points a passenger earns for a given amount actually paid.
// Points are only ever calculated from a successful, confirmed payment —
// callers should not invoke this for cancelled/failed/unpaid bookings.
export function calculateEarnedPoints(amountPaid) {
  return Math.max(0, Math.floor(amountPaid * POINTS_PER_PESO_EARNED));
}

// Whether the passenger currently has enough points to redeem at all.
export function canUseSmartPoints(pointsBalance) {
  return pointsBalance >= MIN_REDEMPTION_POINTS;
}

// The most points that can be applied to a given fare: capped by both the
// passenger's balance and the fare itself (a discount can only reduce the
// ticket to ₱0, never below).
export function calculateMaxRedeemablePoints(fare, pointsBalance) {
  if (!canUseSmartPoints(pointsBalance)) return 0;
  return Math.max(0, Math.min(pointsBalance, Math.floor(fare)));
}

// Full checkout math for a ticket, given whether the passenger has toggled
// "Use SmartPoints" on. Used identically on the payment page and the
// payment confirmation step so the numbers never drift apart.
export function calculateCheckout(fare, pointsBalance, useSmartPoints) {
  const eligible = canUseSmartPoints(pointsBalance);
  const pointsUsed = useSmartPoints && eligible ? calculateMaxRedeemablePoints(fare, pointsBalance) : 0;
  const discount = pointsUsed * PESO_PER_POINT_REDEEMED;
  const amountToPay = Math.max(0, fare - discount);

  return { eligible, pointsUsed, discount, amountToPay };
}

// A light-touch milestone system that rides alongside the points balance —
// it doesn't gate anything, it just gives frequent riders a sense of
// progress on top of the real (points = discount) reward.
export const REWARD_TIERS = [
  { label: "Silver Rider", threshold: 0 },
  { label: "Gold Rider", threshold: 500 },
];

export function getCurrentTier(points) {
  return [...REWARD_TIERS].reverse().find((tier) => points >= tier.threshold) ?? REWARD_TIERS[0];
}

// The next tier to reach, or null if the passenger is already at the top.
export function getNextTier(points) {
  return REWARD_TIERS.find((tier) => points < tier.threshold) ?? null;
}
