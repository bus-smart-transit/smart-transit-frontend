import { createContext, useContext, useState, useCallback } from "react";
import { REWARDS_POINTS, REWARDS_ACTIVITY } from "../data/sampleData.js";
import { calculateEarnedPoints, MIN_REDEMPTION_POINTS } from "../utils/rewards.js";

const RewardsContext = createContext(null);

// Holds the passenger's live SmartPoints balance + activity log for the
// whole app, so the topbar, Profile, Rewards page, and checkout all read
// and update the same numbers instead of drifting apart.
export function RewardsProvider({ children }) {
  const [points, setPoints] = useState(REWARDS_POINTS);
  const [activity, setActivity] = useState(REWARDS_ACTIVITY);

  // Call after a successful, confirmed ticket payment. `amountPaid` should
  // be the amount actually charged (fare minus any SmartPoints discount) —
  // never call this for cancelled, failed, or unpaid bookings.
  const earnPoints = useCallback(({ amountPaid, route, date }) => {
    const earned = calculateEarnedPoints(amountPaid);
    if (earned <= 0) return 0;

    setPoints((prev) => prev + earned);
    setActivity((prev) => [
      {
        id: `earn-${Date.now()}`,
        type: "earn",
        points: earned,
        label: "Ticket purchase",
        route,
        date,
      },
      ...prev,
    ]);
    return earned;
  }, []);

  // Call when a passenger checks out with "Use SmartPoints" enabled.
  const redeemPoints = useCallback(({ pointsUsed, route, date }) => {
    if (pointsUsed <= 0) return 0;

    setPoints((prev) => Math.max(0, prev - pointsUsed));
    setActivity((prev) => [
      {
        id: `redeem-${Date.now()}`,
        type: "redeem",
        points: pointsUsed,
        label: "Used for ticket discount",
        route,
        date,
      },
      ...prev,
    ]);
    return pointsUsed;
  }, []);

  return (
    <RewardsContext.Provider
      value={{ points, activity, earnPoints, redeemPoints, MIN_REDEMPTION_POINTS }}
    >
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards() {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error("useRewards must be used inside a <RewardsProvider>");
  }
  return context;
}
