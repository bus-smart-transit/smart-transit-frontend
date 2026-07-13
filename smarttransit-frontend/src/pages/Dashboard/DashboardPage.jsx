import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import CalendarWidget from "../../components/CalendarWidget.jsx";
import {
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  BellIcon,
  RouteIcon,
} from "../../components/Icons.jsx";
import {
  UPCOMING_TRIPS,
  RECENT_BOOKINGS,
  ACTIVE_ROUTES,
  ANNOUNCEMENTS,
  BUS_SCHEDULE,
  ROUTE_STATS,
} from "../../data/sampleData.js";
import "./DashboardPage.css";

const STATS = [
  { icon: TicketIcon, label: "Upcoming Trips", value: UPCOMING_TRIPS.length },
  { icon: ClockIcon, label: "Trips Completed", value: RECENT_BOOKINGS.length },
  { icon: MapPinIcon, label: "Active Routes Nearby", value: ACTIVE_ROUTES.length },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-page__header">
          <div>
            <h1>Welcome, Josh!</h1>
            <p>Sunday, May 23, 2027 · Davao City</p>
          </div>
        </div>

        <div className="dashboard-page__stats">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div className="stat-card" key={label}>
              <div className="stat-card__icon">
                <Icon size={22} />
              </div>
              <div>
                <p className="stat-card__value">{value}</p>
                <p className="stat-card__label">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-page__columns">
          <div className="dashboard-page__main-column">
            <section className="dashboard-panel">
              <h2>Upcoming Trip</h2>
              {UPCOMING_TRIPS.length === 0 ? (
                <p className="dashboard-panel__empty">
                  No upcoming trips yet — search above to book one.
                </p>
              ) : (
                UPCOMING_TRIPS.map((trip) => (
                  <div className="upcoming-trip" key={trip.id}>
                    <div>
                      <p className="upcoming-trip__route">{trip.route}</p>
                      <p className="upcoming-trip__meta">
                        {trip.date} · {trip.time} · Seat {trip.seat}
                      </p>
                    </div>
                    <span className="upcoming-trip__status">{trip.status}</span>
                  </div>
                ))
              )}
            </section>

            <section className="dashboard-panel">
              <h2>Bus Schedule</h2>
              <table className="bus-schedule">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Departure</th>
                    <th>Bus</th>
                  </tr>
                </thead>
                <tbody>
                  {BUS_SCHEDULE.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.route}</td>
                      <td>{entry.time}</td>
                      <td>{entry.bus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="dashboard-panel">
              <h2>Recent Bookings</h2>
              <table className="recent-bookings">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_BOOKINGS.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.route}</td>
                      <td>{booking.date}</td>
                      <td>₱{booking.amount.toFixed(2)}</td>
                      <td>
                        <span className="recent-bookings__status">{booking.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="dashboard-panel">
              <h2>
                <RouteIcon size={18} /> Your Route Statistics
              </h2>
              <div className="route-stats">
                <div>
                  <p className="route-stats__value">{ROUTE_STATS.totalTrips}</p>
                  <p className="route-stats__label">Total Trips</p>
                </div>
                <div>
                  <p className="route-stats__value">{ROUTE_STATS.mostTraveledRoute}</p>
                  <p className="route-stats__label">Most Traveled Route</p>
                </div>
                <div>
                  <p className="route-stats__value">₱{ROUTE_STATS.totalSpent}</p>
                  <p className="route-stats__label">Total Spent</p>
                </div>
                <div>
                  <p className="route-stats__value">{ROUTE_STATS.onTimeRate}%</p>
                  <p className="route-stats__label">On-Time Rate</p>
                </div>
              </div>
            </section>
          </div>

          <div className="dashboard-page__side-column">
            <section className="dashboard-panel">
              <h2>Calendar</h2>
              <CalendarWidget year={2026} month={5} highlightDays={[10]} />
            </section>

            <section className="dashboard-panel">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <button onClick={() => navigate("/booking")}>Book a New Trip</button>
                <button onClick={() => navigate("/track-bus")}>Track My Bus</button>
                <button onClick={() => navigate("/my-tickets")}>View My Tickets</button>
              </div>
            </section>

            <section className="dashboard-panel">
              <h2>Active Routes</h2>
              <ul className="active-routes">
                {ACTIVE_ROUTES.map((route) => (
                  <li key={route.id}>
                    <span>{route.name}</span>
                    <span className="active-routes__count">
                      {route.busesActive} buses active
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="dashboard-panel">
              <h2>
                <BellIcon size={18} /> Announcements
              </h2>
              <ul className="announcements">
                {ANNOUNCEMENTS.map((note) => (
                  <li key={note.id}>
                    <p>{note.title}</p>
                    <span>{note.date}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
