import FeatureSplit from "./FeatureSplit.jsx";
import QrPlaceholder from "../../../components/QrPlaceholder.jsx";
import StatusBadge from "../../../components/ui/StatusBadge.jsx";

function TicketVisual() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-1 shadow-card">
      <div className="rounded-xl bg-navy-900 p-5 text-white">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold">SmartTransit Express</p>
          <StatusBadge status="Confirmed" />
        </div>
        <p className="mt-3 font-display text-lg font-bold">Ecoland Terminal → Tagum Terminal</p>
        <p className="text-sm text-navy-200">June 10, 2026 · 7:00 AM · Seat 13</p>
      </div>
      <div className="flex items-center gap-4 border-t border-dashed border-slate-200 p-5">
        <QrPlaceholder size={84} />
        <div className="text-sm">
          <p className="text-slate-400">Booking ID</p>
          <p className="font-semibold text-navy-950">ST-20260610-0142</p>
          <p className="mt-2 text-slate-400">Fare Paid</p>
          <p className="font-semibold text-navy-950">₱50.00</p>
        </div>
      </div>
    </div>
  );
}

export default function TicketsShowcase() {
  return (
    <FeatureSplit
      reverse
      eyebrow="Digital Tickets"
      title="Your ticket lives on your phone"
      description="Every booking generates a digital ticket with a scannable QR code — no printouts, no paper stubs to lose. Just show your phone to the conductor when boarding."
      bullets={[
        "Instant e-ticket after payment is confirmed",
        "QR code boarding, no printing required",
        "All your tickets organized in one place",
      ]}
      cta={{ label: "View My Tickets", to: "/my-tickets" }}
      visual={<TicketVisual />}
    />
  );
}
