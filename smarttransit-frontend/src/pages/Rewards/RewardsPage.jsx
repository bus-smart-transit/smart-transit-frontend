import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { GiftIcon, BadgeIcon, CoinIcon, CheckCircleIcon } from "../../components/Icons.jsx";
import {
  REWARDS_NEXT_TIER,
  REWARDS_TIER,
  AVAILABLE_REWARDS,
  EARNED_BADGES,
  REDEMPTION_HISTORY,
  REWARDS_POINTS,
} from "../../data/sampleData.js";

export default function RewardsPage() {
  const [points, setPoints] = useState(REWARDS_POINTS);
  const [history, setHistory] = useState(REDEMPTION_HISTORY);
  const [pendingReward, setPendingReward] = useState(null);
  const [redeemed, setRedeemed] = useState(false);

  const progressPercent = Math.min(100, Math.round((points / REWARDS_NEXT_TIER) * 100));

  const handleConfirmRedeem = () => {
    if (!pendingReward) return;
    setPoints((prev) => prev - pendingReward.cost);
    setHistory((prev) => [
      {
        id: `redeem-${Date.now()}`,
        date: "Today",
        reward: pendingReward.title,
        pointsUsed: pendingReward.cost,
      },
      ...prev,
    ]);
    setRedeemed(true);
  };

  const closeModal = () => {
    setPendingReward(null);
    setRedeemed(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="flex flex-col gap-6 bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-sm text-navy-200">Your Rewards Points</p>
            <p className="mt-1 flex items-center gap-2 font-display text-3xl font-bold">
              <CoinIcon size={22} />
              {points.toLocaleString()} pts
            </p>
            <p className="mt-1 text-sm text-teal-300">Current Tier: {REWARDS_TIER}</p>
          </div>

          <div className="w-full sm:max-w-xs">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-navy-200">
              {points} / {REWARDS_NEXT_TIER} pts to Gold Rider
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">About Rewards</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Earn points every time you complete a paid trip with SmartTransit — 1 point for every
            ₱1 spent on fare. Redeem points for fare discounts, waived fees, or free one-way
            tickets on your favorite routes across Davao Region XI.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">Available Rewards</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AVAILABLE_REWARDS.map((reward) => {
              const canRedeem = points >= reward.cost;
              return (
                <div key={reward.id} className="flex flex-col rounded-xl border border-slate-200 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <GiftIcon size={20} />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-navy-950">{reward.title}</h3>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
                    {reward.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-navy-700">{reward.cost} pts</span>
                    <Button
                      size="sm"
                      variant={canRedeem ? "primary" : "outline"}
                      disabled={!canRedeem}
                      onClick={() => setPendingReward(reward)}
                    >
                      {canRedeem ? "Redeem" : "Not enough"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">Earned Badges</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {EARNED_BADGES.map((badge) => (
              <div
                key={badge.id}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-xs font-medium ${
                  badge.earned
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <BadgeIcon size={24} />
                {badge.label}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">Redemption History</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No rewards redeemed yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Reward</th>
                    <th className="pb-2">Points Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2.5 text-slate-500">{entry.date}</td>
                      <td className="py-2.5 font-medium text-navy-950">{entry.reward}</td>
                      <td className="py-2.5 text-slate-500">-{entry.pointsUsed} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={Boolean(pendingReward)} onClose={closeModal} title={redeemed ? "Reward redeemed" : "Confirm redemption"}>
        {pendingReward && !redeemed && (
          <div>
            <p className="text-sm text-slate-600">
              Redeem <strong>{pendingReward.title}</strong> for{" "}
              <strong>{pendingReward.cost} pts</strong>? This will be deducted from your rewards
              balance immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmRedeem}>
                Confirm Redeem
              </Button>
            </div>
          </div>
        )}

        {pendingReward && redeemed && (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <CheckCircleIcon size={30} />
            </span>
            <p className="mt-4 text-sm text-slate-600">
              <strong>{pendingReward.title}</strong> has been redeemed. You now have{" "}
              <strong>{points.toLocaleString()} pts</strong> remaining.
            </p>
            <Button variant="primary" className="mt-6 w-full" onClick={closeModal}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
