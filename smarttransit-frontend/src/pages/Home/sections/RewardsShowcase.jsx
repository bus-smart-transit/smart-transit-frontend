import FeatureSplit from "./FeatureSplit.jsx";
import Card from "../../../components/ui/Card.jsx";
import { CoinIcon, GiftIcon } from "../../../components/Icons.jsx";

function RewardsVisual() {
  return (
    <Card className="w-full max-w-sm p-6">
      <div className="flex items-center gap-2 text-teal-700">
        <CoinIcon size={20} />
        <p className="font-display text-sm font-semibold">Your Rewards Points</p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-navy-950">1,250 pts</p>
      <p className="text-sm text-slate-400">Silver Rider · 250 pts to Gold Rider</p>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600" style={{ width: "83%" }} />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-teal-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-950">
          <GiftIcon size={18} className="text-teal-600" />
          ₱50 Fare Discount
        </div>
        <span className="text-xs font-semibold text-teal-700">250 pts</span>
      </div>
    </Card>
  );
}

export default function RewardsShowcase() {
  return (
    <FeatureSplit
      reverse
      eyebrow="Rewards"
      title="Earn points on every trip you take"
      description="Every peso you spend on fare earns you a SmartTransit Rewards point. Redeem points for fare discounts, waived fees, or a free one-way ticket on your favorite route."
      bullets={[
        "1 point earned for every ₱1 spent",
        "Redeem for discounts, waived fees, or free tickets",
        "Track badges and redemption history",
      ]}
      cta={{ label: "See Rewards", to: "/rewards" }}
      visual={<RewardsVisual />}
    />
  );
}
