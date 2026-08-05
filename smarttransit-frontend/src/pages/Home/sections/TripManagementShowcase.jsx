import FeatureSplit from "./FeatureSplit.jsx";
import Card from "../../../components/ui/Card.jsx";
import StatusBadge from "../../../components/ui/StatusBadge.jsx";
import { ClockIcon } from "../../../components/Icons.jsx";

const ROWS = [
  { route: "Ecoland → Digos", date: "May 28, 2026", status: "Completed" },
  { route: "Ecoland → Panabo", date: "May 20, 2026", status: "Completed" },
  { route: "Ecoland → Mati", date: "May 4, 2026", status: "Cancelled" },
];

function TripManagementVisual() {
  return (
    <Card className="w-full max-w-md p-5">
      <div className="flex items-center gap-2">
        <ClockIcon size={18} className="text-teal-600" />
        <p className="font-display text-sm font-semibold text-navy-950">Recent Trips</p>
      </div>
      <div className="mt-4 space-y-3">
        {ROWS.map((row) => (
          <div
            key={row.route}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold text-navy-950">{row.route}</p>
              <p className="text-xs text-slate-400">{row.date}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function TripManagementShowcase() {
  return (
    <FeatureSplit
      eyebrow="Trip Management"
      title="Every trip, organized in one place"
      description="From upcoming bookings to completed rides, Trip History keeps a clear record of everywhere you've travelled with SmartTransit — searchable and filterable, anytime."
      bullets={[
        "Search and filter past trips by status",
        "Fare, payment method, and bus operator on record",
        "Desktop table, mobile-friendly cards",
      ]}
      cta={{ label: "View Trip History", to: "/trip-history" }}
      visual={<TripManagementVisual />}
      tone="tinted"
    />
  );
}
