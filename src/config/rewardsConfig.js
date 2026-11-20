// SmartPoints, as the server applies them (backend RewardService). Keep these numbers in step with it:
//  - pesosPerPointEarned: PESOS_PER_POINT   (points are earned for every PHP 20 paid online, after any points used)
//  - pointsEarnedPerStep: DECIMAL_RATE      (2026-11-20: 0.1 point per PHP 20, kept to two decimals)
//  - pesoValueOfPoint:    REDEMPTION_PESOS_PER_POINT (1 point takes PHP 1 off an online one-way checkout; whole points only)
// The screens only explain these rules; the server does the counting.
export const REWARDS = {
  pesosPerPointEarned: 20,
  pointsEarnedPerStep: 0.1,
  pesoValueOfPoint: 1,
};
