import DashboardLayout from "../../components/DashboardLayout.jsx";
import CalendarWidget from "../../components/CalendarWidget.jsx";
import Card from "../../components/ui/Card.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import Button from "../../components/ui/Button.jsx";
import {
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  BellIcon,
  RouteIcon,
  GiftIcon,
} from "../../components/Icons.jsx";
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

export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
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

        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <Icon size={22} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-navy-950">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-navy-950">Upcoming Trip</h2>
              {UPCOMING_TRIPS.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No upcoming trips yet — search from the homepage to book one.
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
                        <p className="text-xs text-slate-500">
                          {trip.date} · {trip.time} · Seat {trip.seat}
                        </p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-navy-950">Bus Schedule</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="pb-2">Route</th>
                      <th className="pb-2">Departure</th>
                      <th className="pb-2">Bus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {BUS_SCHEDULE.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2.5 font-medium text-navy-950">{entry.route}</td>
                        <td className="py-2.5 text-slate-500">{entry.time}</td>
                        <td className="py-2.5 text-slate-500">{entry.bus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-navy-950">Recent Bookings</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="pb-2">Route</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {RECENT_BOOKINGS.map((booking) => (
                      <tr key={booking.id}>
                        <td className="py-2.5 font-medium text-navy-950">{booking.route}</td>
                        <td className="py-2.5 text-slate-500">{booking.date}</td>
                        <td className="py-2.5 text-slate-500">₱{booking.amount.toFixed(2)}</td>
                        <td className="py-2.5">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-950">
                <RouteIcon size={18} className="text-teal-600" /> Your Route Statistics
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="font-display text-xl font-bold text-navy-950">{ROUTE_STATS.totalTrips}</p>
                  <p className="text-xs text-slate-500">Total Trips</p>
                </div>
                <div>
                  <p className="font-display text-base font-bold text-navy-950">
                    {ROUTE_STATS.mostTraveledRoute}
                  </p>
                  <p className="text-xs text-slate-500">Most Traveled Route</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-navy-950">
                    ₱{ROUTE_STATS.totalSpent}
                  </p>
                  <p className="text-xs text-slate-500">Total Spent</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-navy-950">
                    {ROUTE_STATS.onTimeRate}%
                  </p>
                  <p className="text-xs text-slate-500">On-Time Rate</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-navy-950">Calendar</h2>
              <div className="mt-4">
                <CalendarWidget year={2026} month={5} highlightDays={[10]} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-navy-950">Quick Actions</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
                  <Button key={to} to={to} variant="outline" size="sm" className="!flex-col !py-3.5">
                    <Icon size={18} />
                    {label}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold text-navy-950">Active Routes</h2>
              <ul className="mt-4 space-y-3">
                {ACTIVE_ROUTES.map((route) => (
                  <li key={route.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-navy-950">{route.name}</span>
                    <span className="text-xs text-slate-500">{route.busesActive} buses active</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-950">
                <BellIcon size={18} className="text-teal-600" /> Announcements
              </h2>
              <ul className="mt-4 space-y-3">
                {ANNOUNCEMENTS.map((note) => (
                  <li key={note.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-sm font-medium text-navy-950">{note.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{note.date}</p>
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
