import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import CalendarWidget from "../../components/CalendarWidget.jsx";
import Card from "../../components/ui/Card.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { TicketIcon, ClockIcon, MapPinIcon, GiftIcon } from "../../components/Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  UPCOMING_TRIPS,
  RECENT_BOOKINGS,
  ACTIVE_ROUTES,
  ANNOUNCEMENTS,
  BUS_SCHEDULE,
  ROUTE_STATS,
} from "../../data/sampleData.js";

const STATS = [
  { icon: TicketIcon, label: "Upcoming Trips", value: UPCOMING_TRIPS.length },
  { icon: ClockIcon, label: "Trips Completed", value: RECENT_BOOKINGS.length },
  { icon: MapPinIcon, label: "Active Routes Nearby", value: ACTIVE_ROUTES.length },
];

const QUICK_ACTIONS = [
  { to: "/my-tickets", label: "My Tickets", icon: TicketIcon },
  { to: "/trip-history", label: "Trip History", icon: ClockIcon },
  { to: "/track-bus", label: "Track Bus", icon: MapPinIcon },
  { to: "/rewards", label: "Rewards", icon: GiftIcon },
];

const ROUTE_STAT_ITEMS = [
  { label: "Total Trips", value: ROUTE_STATS.totalTrips },
  { label: "Most Traveled Route", value: ROUTE_STATS.mostTraveledRoute },
  { label: "Total Spent", value: `PHP ${Number(ROUTE_STATS.totalSpent).toFixed(2)}` },
  { label: "On-Time Rate", value: `${ROUTE_STATS.onTimeRate}%` },
];

// "2026-11-07T13:38:00" -> "2026/11/07 - 13:38"
function formatPaidAt(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} - ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

const TH = "pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400 last:pr-0";
const TD = "py-3 pr-4 last:pr-0";

function SectionTitle({ children }) {
  return <h2 className="font-display text-lg font-semibold text-navy-950">{children}</h2>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            Welcome, {user?.firstName ?? "Passenger"}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">{formattedDate} · Davao City</p>
        </div>

        <div className="stagger grid gap-4 sm:grid-cols-3">
          {STATS.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="hover-lift group flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800 transition-colors duration-300 group-hover:bg-navy-800 group-hover:text-white">
                <Icon size={20} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold leading-tight text-navy-950">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="stagger min-w-0 space-y-6 lg:col-span-2">
            <Card className="p-6">
              <SectionTitle>Upcoming Trip</SectionTitle>
              {UPCOMING_TRIPS.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No upcoming trips yet. Search from the homepage to book one.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {UPCOMING_TRIPS.map((trip) => (
                    <div
                      key={trip.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-navy-950">{trip.route}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {trip.date} · {trip.time}
                        </p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <SectionTitle>Bus Schedule</SectionTitle>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Route</th>
                      <th className={TH}>Departure</th>
                      <th className={TH}>Bus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {BUS_SCHEDULE.map((entry) => (
                      <tr key={entry.id} className="transition-colors hover:bg-slate-50">
                        <td className={`${TD} font-medium text-navy-950`}>{entry.route}</td>
                        <td className={`${TD} text-slate-500`}>{entry.time}</td>
                        <td className={`${TD} text-slate-500`}>{entry.bus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle>Recent Bookings</SectionTitle>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>Origin</th>
                      <th className={TH}>Destination</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>Amount</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {RECENT_BOOKINGS.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`${TD} text-slate-500`}>
                          No bookings yet.
                        </td>
                      </tr>
                    ) : (
                      RECENT_BOOKINGS.map((booking) => (
                        <tr key={booking.id} className="transition-colors hover:bg-slate-50">
                          <td className={`${TD} font-medium text-navy-950`}>{booking.origin}</td>
                          <td className={`${TD} text-slate-500`}>{booking.destination}</td>
                          <td className={`${TD} whitespace-nowrap tabular-nums text-slate-500`}>
                            {formatPaidAt(booking.paidAt)}
                          </td>
                          <td className={`${TD} whitespace-nowrap tabular-nums text-slate-500`}>
                            PHP {Number(booking.amount ?? 0).toFixed(2)}
                          </td>
                          <td className={TD}>
                            <StatusBadge status={booking.status || "-"} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle>Your Route Statistics</SectionTitle>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                {ROUTE_STAT_ITEMS.map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="mt-1 truncate font-display text-lg font-bold text-navy-950" title={String(value)}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <div className="stagger min-w-0 space-y-6">
            <Card className="p-6">
              <SectionTitle>Calendar</SectionTitle>
              <div className="mt-4">
                <CalendarWidget tripDates={UPCOMING_TRIPS.map((trip) => trip.date)} />
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm font-medium text-navy-900 transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:bg-navy-50 hover:shadow-card active:scale-[0.98]"
                  >
                    <Icon size={20} className="text-navy-700 transition-transform duration-300 group-hover:scale-110" />
                    {label}
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle>Active Routes</SectionTitle>
              <ul className="mt-4 divide-y divide-slate-100">
                {ACTIVE_ROUTES.map((route) => (
                  <li key={route.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium text-navy-950">{route.name}</span>
                    <span className="whitespace-nowrap text-slate-500">{route.busesActive} buses active</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <SectionTitle>Announcements</SectionTitle>
              <ul className="mt-4 divide-y divide-slate-100">
                {ANNOUNCEMENTS.map((note) => (
                  <li key={note.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-navy-950">{note.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{note.date}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
