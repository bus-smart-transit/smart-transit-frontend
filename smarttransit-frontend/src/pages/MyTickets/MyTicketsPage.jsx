import { useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import QrPlaceholder from "../../components/QrPlaceholder.jsx";
import Card from "../../components/ui/Card.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import FilterTabs from "../../components/ui/FilterTabs.jsx";
import { ChevronDownIcon } from "../../components/Icons.jsx";
import { SAMPLE_TICKETS } from "../../data/sampleData.js";

const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

function matchesFilter(ticket, filter) {
  if (filter === "All") return true;
  if (filter === "Upcoming") return ticket.status === "Confirmed";
  return ticket.status === filter;
}

export default function MyTicketsPage() {
  const [filter, setFilter] = useState("All");
  const [openTicket, setOpenTicket] = useState(SAMPLE_TICKETS[0]?.bookingId ?? null);

  const filteredTickets = useMemo(
    () => SAMPLE_TICKETS.filter((ticket) => matchesFilter(ticket, filter)),
    [filter]
  );

  const toggleTicket = (bookingId) => {
    setOpenTicket((current) => (current === bookingId ? null : bookingId));
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
              My Tickets
            </h1>
            <p className="mt-1 text-sm text-slate-500">{SAMPLE_TICKETS.length} bookings on file</p>
          </div>
          <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <div className="mt-6 space-y-4">
          {filteredTickets.length === 0 && (
            <Card className="p-8 text-center text-sm text-slate-500">
              No tickets match this filter.
            </Card>
          )}

          {filteredTickets.map((ticket) => {
            const isOpen = openTicket === ticket.bookingId;
            return (
              <Card key={ticket.bookingId} className="overflow-hidden">
                <button
                  className="flex w-full flex-wrap items-center gap-4 p-5 text-left sm:flex-nowrap sm:gap-6"
                  onClick={() => toggleTicket(ticket.bookingId)}
                  aria-expanded={isOpen}
                >
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-xs font-semibold text-slate-400">{ticket.bookingId}</p>
                    <p className="mt-0.5 text-sm font-semibold text-navy-950">
                      {ticket.origin} → {ticket.destination}
                    </p>
                  </div>
                  <div className="flex flex-col text-xs text-slate-500 sm:text-sm">
                    <span>{ticket.departure}</span>
                    <span>Seat {ticket.seat}</span>
                  </div>
                  <StatusBadge status={ticket.status} />
                  <ChevronDownIcon
                    size={18}
                    className={`ml-auto shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="grid gap-6 border-t border-slate-100 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-400">Bus Operator</p>
                        <p className="font-semibold text-navy-950">{ticket.operator}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Origin</p>
                        <p className="font-semibold text-navy-950">{ticket.origin}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Destination</p>
                        <p className="font-semibold text-navy-950">{ticket.destination}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Departure</p>
                        <p className="font-semibold text-navy-950">{ticket.departure}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Seat Number</p>
                        <p className="font-semibold text-navy-950">{ticket.seat}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Fare Paid</p>
                        <p className="font-semibold text-navy-950">₱{ticket.fare.toFixed(2)}</p>
                      </div>
                    </div>

                    {ticket.status !== "Cancelled" ? (
                      <div className="flex flex-col items-center gap-2 justify-self-center rounded-xl bg-slate-50 p-4 text-center">
                        <QrPlaceholder size={100} />
                        <span className="text-xs text-slate-500">Present this QR code to board</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl bg-red-50 p-4 text-center text-xs font-medium text-red-600 sm:w-52">
                        This booking was cancelled — no ticket to present.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
