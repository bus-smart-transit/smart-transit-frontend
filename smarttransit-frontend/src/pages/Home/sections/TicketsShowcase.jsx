import QrPlaceholder from "../../../components/QrPlaceholder.jsx";
import StatusBadge from "../../../components/ui/StatusBadge.jsx";
import Button from "../../../components/ui/Button.jsx";

const TICKET_FIELDS = [
  { label: "Origin", value: "Ecoland Terminal" },
  { label: "Destination", value: "Tagum Terminal" },
  { label: "Date", value: "June 10, 2026" },
  { label: "Departure", value: "7:00 AM" },
  { label: "Seat", value: "13" },
  { label: "Booking ID", value: "ST-20260610-0142" },
];

const BOARDING_STEPS = [
  { step: "1", title: "Open My Tickets", description: "Find your active booking." },
  { step: "2", title: "Select your trip", description: "Open the ticket you want to use." },
  {
    step: "3",
    title: "Check your details",
    description: "Make sure your route, schedule, and seat are correct.",
  },
  { step: "4", title: "Show your QR code", description: "Present the QR code when boarding." },
];

function TicketPreview() {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
      <div className="bg-navy-900 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold">SmartTransit Express</p>
          <StatusBadge status="Confirmed" />
        </div>
        <p className="mt-3 text-xs uppercase tracking-wide text-navy-300">Passenger</p>
        <p className="font-display text-base font-semibold">Juan Dela Cruz</p>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-dashed border-slate-200 px-5 py-4 text-sm">
        {TICKET_FIELDS.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="font-semibold text-navy-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <p className="text-xs leading-relaxed text-slate-400">
          Present this QR code
          <br />
          when boarding.
        </p>
        <QrPlaceholder size={76} />
      </div>
    </div>
  );
}

export default function TicketsShowcase() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Your Digital Ticket
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Your digital ticket is always in your account.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Once your booking is confirmed, you can access your digital ticket from My Tickets.
            Keep your QR code ready when boarding.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-16">
          <TicketPreview />

          <div>
            <h3 className="font-display text-lg font-semibold text-navy-950">Before boarding</h3>
            <ol className="mt-5 space-y-5">
              {BOARDING_STEPS.map(({ step, title, description }) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-bold text-navy-800">
                    {step}
                  </span>
                  <div>
                    <p className="font-semibold text-navy-950">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button to="/my-tickets" variant="primary" size="md" className="mt-7">
              View My Tickets
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
