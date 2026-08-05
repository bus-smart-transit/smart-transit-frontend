import FeatureSplit from "./FeatureSplit.jsx";
import { BusIcon, MapPinIcon, ClockIcon } from "../../../components/Icons.jsx";
import Card from "../../../components/ui/Card.jsx";
import StatusBadge from "../../../components/ui/StatusBadge.jsx";

function TrackingVisual() {
  return (
    <Card className="w-full max-w-md p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-navy-950">Bus 01 · Ecoland ⇄ Tagum</p>
        <StatusBadge status="On Time" />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-navy-900">
        <svg viewBox="0 0 300 150" className="h-40 w-full">
          <path
            d="M20,120 C80,60 140,110 180,60 C210,25 250,40 280,20"
            stroke="#41fdfe"
            strokeWidth="3"
            strokeDasharray="6 6"
            fill="none"
            opacity="0.7"
          />
          <circle cx="20" cy="120" r="5" fill="white" />
          <circle cx="280" cy="20" r="5" fill="white" />
          <g transform="translate(150,80)">
            <circle r="12" fill="#41fdfe" opacity="0.3" />
            <circle r="7" fill="#41fdfe" />
          </g>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <MapPinIcon size={16} className="text-teal-600" />
          <div>
            <p className="text-xs text-slate-400">Next Stop</p>
            <p className="font-semibold text-navy-950">Panabo Junction</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon size={16} className="text-teal-600" />
          <div>
            <p className="text-xs text-slate-400">ETA</p>
            <p className="font-semibold text-navy-950">12 min</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function TrackingShowcase() {
  return (
    <FeatureSplit
      eyebrow="Bus Tracking"
      title="Know exactly where your bus is"
      description="No more guessing at the terminal. Open Track Bus to see your bus's current stop, next stop, and estimated arrival time, updated live on the route map."
      bullets={[
        "Live route map with current bus position",
        "Estimated arrival time for your stop",
        "Works for guests and signed-in passengers alike",
      ]}
      cta={{ label: "Track a Bus", to: "/track-bus" }}
      visual={<TrackingVisual />}
      tone="tinted"
    />
  );
}
