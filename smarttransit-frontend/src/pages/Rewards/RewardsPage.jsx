import DashboardLayout from "../../components/DashboardLayout.jsx";
import { GiftIcon, BadgeIcon, CoinIcon } from "../../components/Icons.jsx";
import {
  REWARDS_POINTS,
  REWARDS_NEXT_TIER,
  REWARDS_TIER,
  AVAILABLE_REWARDS,
  EARNED_BADGES,
  REDEMPTION_HISTORY,
} from "../../data/sampleData.js";
import "./RewardsPage.css";

export default function RewardsPage() {
  const progressPercent = Math.min(
    100,
    Math.round((REWARDS_POINTS / REWARDS_NEXT_TIER) * 100)
  );

  return (
    <DashboardLayout>
      <div className="rewards-page">
        <div className="rewards-banner">
          <div>
            <p className="rewards-banner__label">Your Rewards Points</p>
            <p className="rewards-banner__points">
              <CoinIcon size={22} />
              {REWARDS_POINTS.toLocaleString()} pts
            </p>
            <p className="rewards-banner__tier">Current Tier: {REWARDS_TIER}</p>
          </div>

          <div className="rewards-banner__progress">
            <div className="rewards-banner__progress-track">
              <div
                className="rewards-banner__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p>
              {REWARDS_POINTS} / {REWARDS_NEXT_TIER} pts to Gold Rider
            </p>
          </div>
        </div>

        <section className="rewards-section">
          <h2>About Rewards</h2>
          <p className="rewards-section__body">
            Earn points every time you complete a paid trip with SmartTransit
            — 1 point for every ₱1 spent on fare. Redeem points for fare
            discounts, waived fees, or free one-way tickets on your favorite
            routes across Davao Region XI.
          </p>
        </section>

        <section className="rewards-section">
          <h2>Available Rewards</h2>
          <div className="rewards-grid">
            {AVAILABLE_REWARDS.map((reward) => {
              const canRedeem = REWARDS_POINTS >= reward.cost;
              return (
                <div className="reward-card" key={reward.id}>
                  <div className="reward-card__icon">
                    <GiftIcon size={22} />
                  </div>
                  <h3>{reward.title}</h3>
                  <p>{reward.description}</p>
                  <div className="reward-card__footer">
                    <span>{reward.cost} pts</span>
                    <button disabled={!canRedeem}>
                      {canRedeem ? "Redeem" : "Not enough points"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rewards-section">
          <h2>Earned Badges</h2>
          <div className="badges-grid">
            {EARNED_BADGES.map((badge) => (
              <div
                className={`badge-card ${badge.earned ? "" : "badge-card--locked"}`}
                key={badge.id}
              >
                <BadgeIcon size={26} />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rewards-section">
          <h2>Redemption History</h2>
          {REDEMPTION_HISTORY.length === 0 ? (
            <p className="rewards-section__body">No rewards redeemed yet.</p>
          ) : (
            <table className="redemption-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reward</th>
                  <th>Points Used</th>
                </tr>
              </thead>
              <tbody>
                {REDEMPTION_HISTORY.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.reward}</td>
                    <td>-{entry.pointsUsed} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
