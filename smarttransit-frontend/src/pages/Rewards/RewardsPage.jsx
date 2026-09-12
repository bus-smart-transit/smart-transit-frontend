import DashboardLayout from "../../components/DashboardLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import { CoinIcon, CheckCircleIcon, PlusIcon, MinusIcon, InfoIcon } from "../../components/Icons.jsx";
import { useRewards } from "../../context/RewardsContext.jsx";
import { MIN_REDEMPTION_POINTS } from "../../utils/rewards.js";

export default function RewardsPage() {
  const { points, activity } = useRewards();

  const eligible = points >= MIN_REDEMPTION_POINTS;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Balance hero -- the whole reward system in one glance */}
        <Card className="!bg-navy-900 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-navy-200">
                <CoinIcon size={16} /> SmartPoints
              </p>
              <p className="mt-1 font-display text-4xl font-bold">{points.toLocaleString()}</p>
              <p className="mt-1 text-sm text-teal-300">
                Worth ₱{points.toLocaleString()} in ticket discounts
              </p>
            </div>

            {eligible ? (
              <div className="flex items-center gap-3 rounded-xl bg-teal-400/10 px-4 py-3 sm:max-w-xs">
                <CheckCircleIcon size={24} className="shrink-0 text-teal-300" />
                <p className="text-sm text-teal-100">
                  <span className="font-semibold text-white">Your rewards are ready to use!</span>{" "}
                  Turn on "Use SmartPoints" at checkout on your next ticket.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 sm:max-w-xs">
                <InfoIcon size={24} className="shrink-0 text-navy-200" />
                <p className="text-sm text-navy-200">
                  Earn <span className="font-semibold text-white">
                    {(MIN_REDEMPTION_POINTS - points).toLocaleString()} more points
                  </span>{" "}
                  to start using your rewards.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* How it works -- keeps the concept dead simple */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">How SmartPoints Work</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Buy a ticket → earn SmartPoints → save your points → use them to reduce the cost of
            your next SmartTransit ticket.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-navy-950">1. Earn</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                ₱1 spent on a ticket = 1 SmartPoint, added automatically after a successful
                payment.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-navy-950">2. Save</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Once you reach {MIN_REDEMPTION_POINTS} points, they're ready to use on any future
                ticket.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-navy-950">3. Use</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                1 SmartPoint = ₱1 off. Switch on "Use SmartPoints" at checkout to apply it
                automatically.
              </p>
            </div>
          </div>
        </Card>

        {/* Activity log -- makes the balance feel functional, not static */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">Rewards Activity</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No activity yet — book a trip to start earning SmartPoints.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {activity.map((entry) => {
                const isEarn = entry.type === "earn";
                return (
                  <div key={entry.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isEarn ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isEarn ? <PlusIcon size={16} /> : <MinusIcon size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy-950">{entry.label}</p>
                      <p className="truncate text-xs text-slate-500">{entry.route}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold ${isEarn ? "text-teal-700" : "text-slate-500"}`}>
                        {isEarn ? "+" : "-"}
                        {entry.points.toLocaleString()} pts
                      </p>
                      <p className="text-xs text-slate-400">{entry.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
