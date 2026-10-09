// SmartPoints, as the server applies them (backend RewardService). Keep these two numbers in step with it:
//  - pesosPerPointEarned: PESOS_PER_POINT   (1 point is earned for every PHP 20 paid online, after any points used)
//  - pesoValueOfPoint:    REDEMPTION_PESOS_PER_POINT (1 point takes PHP 1 off an online one-way checkout)
// The screens only explain these rules; the server does the counting.
export const REWARDS = {
  pesosPerPointEarned: 20,
  pesoValueOfPoint: 1,
};
