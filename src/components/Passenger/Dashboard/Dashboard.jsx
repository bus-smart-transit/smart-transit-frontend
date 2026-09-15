import { Suspense, lazy, useState } from 'react';
import { Bell, Bus, Map, Ticket, User, LogOut, Gift, History, LayoutGrid, Menu, House, X } from 'lucide-react';
import usePassengerDashboard from '../../../api/hooks/Passenger/usePassengerDashboard';
import PassengerService from '../../../api/PassengerService/PassengerService';
import TicketCard from '../Ticket/TicketCard';
import PublicTrackingSection from '../LandingPage/PublicTrackingSection';
import ProfileDropdown from '../../Layout/ProfileDropdown';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';
import SearchBar from '../../ui/SearchBar';
import Toggle from '../../ui/Toggle';
import Modal from '../../ui/Modal';
import { parseAppDate, getBusinessToday } from '../../../utils/dates';

const preloadMapView = () =>
  Promise.all([
    import('../../Map/mapDependencies').then((mod) => mod.preloadMapDependencies()),
    import('../../Map/MapView.web'),
  ]).then(([, mod]) => mod);

const BuyTicket = lazy(() => import('../BuyTicket/BuyTicket'));

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid, protected: false },
  { key: 'tickets', label: 'My Tickets', icon: Ticket, protected: true },
  { key: 'transactions', label: 'Transaction History', icon: History, protected: true },
  { key: 'map', label: 'Track Bus', icon: Map, protected: false },
  { key: 'rewards', label: 'Rewards', icon: Gift, protected: true },
];

const PROTECTED_TABS = new Set(['tickets', 'rewards', 'transactions', 'profile']);

const toTripDate = (ticket) => {
  const raw = ticket?.trip?.trip_date || ticket?.valid_from || ticket?.created_at;
  if (!raw) return null;
  return parseAppDate(raw);
};

// Date-only string ("YYYY-MM-DD") extracted without constructing a Date
// object, so it stays anchored to the business timezone's calendar day
// rather than being reinterpreted through the device's local timezone.
const toTripDateStr = (ticket) => {
  const raw = ticket?.trip?.trip_date || ticket?.valid_from || ticket?.created_at;
  if (!raw) return null;
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const getFleetDisplayLabel = (ticket) => {
  const fleet = ticket?.trip?.fleet_route?.fleet || ticket?.trip?.fleetRoute?.fleet || {};
  return fleet?.plate_number || fleet?.name || (fleet?.fleet_id ? `Fleet ${fleet.fleet_id}` : '-');
};

export default function Dashboard() {
  const {
    closeTicketModal,
    formatDateTime,
    getDestinationLabel,
    getOriginLabel,
    handleLogout,
    handleTabChange,
    isAuthenticated,
    isLoadingPrivate,
    lastSync,
    loadPrivateData,
    loadingTicketQr,
    menuOpen,
    navigate,
    paymentNotice,
    points,
    privateError,
    profile,
    rewards,
    selectedTicket,
    selectedTicketQr,
    setMenuOpen,
    ticketModalOpen,
    tickets,
    transactions,
    user,
    visibleTab,
    openTicketModal,
    printSelectedTicket,
  } = usePassengerDashboard({ preloadMapView });

  const tabFallback = (
    <Card className="p-6">
      <p className="text-sm text-slate-500">Loading section...</p>
    </Card>
  );

  const [twoFactorOverride, setTwoFactorOverride] = useState(null);
  const [updating2fa, setUpdating2fa] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('scheduled');
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const twoFactorEnabled = twoFactorOverride
    ?? profile?.user?.two_factor_enabled
    ?? profile?.two_factor_enabled
    ?? user?.two_factor_enabled
    ?? false;

  const handleTwoFactorToggle = async (enabled) => {
    setTwoFactorOverride(enabled);
    setUpdating2fa(true);
    setTwoFactorMsg('');

    try {
      await PassengerService.setTwoFactorPreference(enabled);
      setTwoFactorMsg(enabled ? '2FA enabled. Future logins require OTP.' : '2FA disabled. Future logins skip OTP.');
    } catch (err) {
      setTwoFactorOverride(null);
      setTwoFactorMsg(err?.message || 'Unable to update 2FA preference right now.');
    } finally {
      setUpdating2fa(false);
    }
  };

  const homeStats = {
    upcomingTrips: tickets.filter((t) => ['valid', 'issued'].includes(String(t?.status || '').toLowerCase())).length,
    tripsCompleted: tickets.filter((t) => String(t?.status || '').toLowerCase() === 'alighted').length,
    nearbyRoutes: new Set(tickets
      .map((t) => t?.trip?.fleet_route?.route?.route_name)
      .filter(Boolean)).size,
  };

  const recentBookings = transactions.slice(0, 4);
  const upcomingTicket = tickets.find((t) => ['valid', 'issued', 'boarded'].includes(String(t?.status || '').toLowerCase())) || null;
  const upcomingScheduleTickets = tickets
    .filter((ticket) => {
      const tripDateStr = toTripDateStr(ticket);
      if (!tripDateStr) return false;
      return tripDateStr >= getBusinessToday();
    })
    .sort((left, right) => {
      const leftTime = toTripDate(left)?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightTime = toTripDate(right)?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftTime - rightTime;
    })
    .slice(0, 5);
  const activeRoutes = [...new Set(tickets
    .map((t) => t?.trip?.fleet_route?.route?.route_name)
    .filter(Boolean))].slice(0, 5);

  const getBookingLocationLabel = (payment, field) => {
    const items = Array.isArray(payment?.items) ? payment.items : [];
    if (items.length === 0) return '-';

    const key = field === 'origin' ? 'origin_stop_name' : 'destination_stop_name';
    const values = [...new Set(items
      .map((item) => String(item?.[key] || '').trim())
      .filter(Boolean))];

    if (values.length === 0) return '-';
    if (values.length === 1) return values[0];
    return `${values[0]} +${values.length - 1} more`;
  };

  const rewardCatalog = [
    { id: 'r1', title: 'P20 Fare Discount', desc: 'Use on any single trip within Davao Region XI.', cost: 100 },
    { id: 'r2', title: 'Free Seat Reservation Fee', desc: 'Waives the reservation fee on your next booking.', cost: 150 },
    { id: 'r3', title: 'P50 Fare Discount', desc: 'Use on any single trip within Davao Region XI.', cost: 250 },
    { id: 'r4', title: 'Free One-Way Ticket (Ecoland ⇄ Digos)', desc: 'Redeem a full one-way fare on this route.', cost: 400 },
  ];
  const numericPoints = Number(profile?.reward_points ?? user?.reward_points ?? 0);

  // S2: ticket-history status filter — Scheduled/Completed/Expired/Group,
  // defaulting to "Scheduled". "Group" counts transaction references shared
  // by more than one ticket (a multi-ticket purchase).
  const ticketRefCounts = {};
  tickets.forEach((t) => {
    const ref = t?.payment?.transaction_reference;
    if (ref) ticketRefCounts[ref] = (ticketRefCounts[ref] ?? 0) + 1;
  });

  const ticketStatusFilterOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'expired', label: 'Expired' },
    { value: 'group', label: 'Group' },
  ];

  const filteredTickets = tickets.filter((ticket) => {
    const normalizedStatus = String(ticket?.status || '').toLowerCase();
    if (ticketStatusFilter === 'scheduled') {
      return ['valid', 'issued', 'boarded'].includes(normalizedStatus);
    }
    if (ticketStatusFilter === 'completed') {
      return normalizedStatus === 'alighted';
    }
    if (ticketStatusFilter === 'expired') {
      return normalizedStatus === 'expired';
    }
    if (ticketStatusFilter === 'group') {
      const ref = ticket?.payment?.transaction_reference;
      return Boolean(ref && (ticketRefCounts[ref] ?? 1) > 1);
    }
    return true;
  });

  const navLinkClasses = (active) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
    active ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-200 hover:bg-teal-400/10 hover:text-teal-300'
  }`;

  const renderContent = () => {
    if (visibleTab === 'dashboard') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
              Welcome, {profile?.name || user?.name || 'Passenger'}!
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <Ticket size={22} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-navy-950">{homeStats.upcomingTrips}</p>
                <p className="text-xs text-slate-500">Upcoming Trips</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <History size={22} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-navy-950">{homeStats.tripsCompleted}</p>
                <p className="text-xs text-slate-500">Trips Completed</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <Map size={22} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-navy-950">{homeStats.nearbyRoutes}</p>
                <p className="text-xs text-slate-500">Active Routes Nearby</p>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-navy-950">Upcoming Trip</h2>
                {upcomingTicket ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-navy-950">
                        {getOriginLabel(upcomingTicket)} → {getDestinationLabel(upcomingTicket)}
                      </p>
                      <p className="text-xs text-slate-500">{formatDateTime(upcomingTicket.valid_from || upcomingTicket.created_at)}</p>
                    </div>
                    <StatusBadge status={upcomingTicket.status || 'confirmed'} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No upcoming trip yet.</p>
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
                      {(showAllSchedule ? upcomingScheduleTickets : upcomingScheduleTickets.slice(0, 4)).map((ticket, idx) => (
                        <tr key={`sched-${ticket.ticket_id ?? idx}`}>
                          <td className="py-2.5 font-medium text-navy-950">{getOriginLabel(ticket)} → {getDestinationLabel(ticket)}</td>
                          <td className="py-2.5 text-slate-500">{formatDateTime(ticket.valid_from || ticket?.trip?.trip_date || ticket.created_at)}</td>
                          <td className="py-2.5 text-slate-500">{getFleetDisplayLabel(ticket)}</td>
                        </tr>
                      ))}
                      {upcomingScheduleTickets.length === 0 && (
                        <tr><td colSpan={3} className="py-2.5 text-slate-500">No upcoming schedule data available yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {upcomingScheduleTickets.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSchedule((prev) => !prev)}
                    className="mt-3 text-sm font-medium text-navy-800 underline hover:text-navy-900"
                  >
                    {showAllSchedule ? 'Show less' : `View all (${upcomingScheduleTickets.length})`}
                  </button>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-navy-950">Recent Bookings</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <th className="pb-2">Origin</th>
                        <th className="pb-2">Destination</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentBookings.map((payment, idx) => (
                        <tr key={`recent-${payment.payment_id ?? idx}`}>
                          <td className="py-2.5 font-medium text-navy-950">{getBookingLocationLabel(payment, 'origin')}</td>
                          <td className="py-2.5 text-slate-500">{getBookingLocationLabel(payment, 'destination')}</td>
                          <td className="py-2.5 text-slate-500">{formatDateTime(payment.paid_at)}</td>
                          <td className="py-2.5 text-slate-500">PHP {Number(payment.amount ?? 0).toFixed(2)}</td>
                          <td className="py-2.5">
                            <StatusBadge status={payment.status || '-'} />
                          </td>
                        </tr>
                      ))}
                      {recentBookings.length === 0 && (
                        <tr><td colSpan={5} className="py-2.5 text-slate-500">No bookings yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-navy-950">Quick Actions</h2>
                <div className="mt-4 flex flex-col gap-2.5">
                  <Button variant="outline" size="sm" onClick={() => handleTabChange({ key: 'buy', protected: false })}>Book a New Trip</Button>
                  <Button variant="outline" size="sm" onClick={() => handleTabChange({ key: 'map', protected: false })}>Track My Bus</Button>
                  <Button variant="outline" size="sm" onClick={() => handleTabChange({ key: 'tickets', protected: true })}>View My Tickets</Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="font-display text-lg font-semibold text-navy-950">Active Routes</h2>
                {activeRoutes.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No active routes found.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {activeRoutes.map((routeName) => (
                      <li key={routeName} className="text-sm font-medium text-navy-950">{routeName}</li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      );
    }

    if (visibleTab === 'buy') {
      return (
        <Suspense fallback={tabFallback}>
          <BuyTicket
            onTicketPurchased={() => {
              if (isAuthenticated) {
                void loadPrivateData();
              }
            }}
          />
        </Suspense>
      );
    }

    if (visibleTab === 'map') {
      return <PublicTrackingSection showHeader={false} compact />;
    }

    if (!isAuthenticated && PROTECTED_TABS.has(visibleTab)) {
      return (
        <Card className="p-8 text-center">
          <h2 className="font-display text-lg font-semibold text-navy-950">Authentication Required</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to access this section.</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => navigate('/passenger/login')}>Sign In</Button>
        </Card>
      );
    }

    if (visibleTab === 'tickets') {
      return (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">My Tickets</h1>
            {tickets.length > 0 && (
              <label className="flex items-center gap-2 text-sm font-medium text-navy-950">
                Filter:
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-navy-950 focus:border-navy-800 focus:outline-none"
                >
                  {ticketStatusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-6">
            {isLoadingPrivate ? (
              <Card className="p-8 text-center text-sm text-slate-500">Loading tickets...</Card>
            ) : filteredTickets.length === 0 ? (
              <Card className="p-8 text-center text-sm text-slate-500">
                No {ticketStatusFilterOptions.find((o) => o.value === ticketStatusFilter)?.label.toLowerCase() || ''} tickets found.
              </Card>
            ) : (
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {filteredTickets.map((ticket, idx) => {
                  const ref = ticket?.payment?.transaction_reference;
                  const isPartOfGroup = ref && (ticketRefCounts[ref] ?? 1) > 1;
                  return (
                    <button
                      key={ticket.ticket_id ?? ticket.ticket_uuid ?? idx}
                      type="button"
                      onClick={() => { void openTicketModal(ticket); }}
                      className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:flex-nowrap"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy-950">{getOriginLabel(ticket)} to {getDestinationLabel(ticket)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Booked: {formatDateTime(ticket?.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPartOfGroup && (
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200 whitespace-nowrap">
                            Group order
                          </span>
                        )}
                        <StatusBadge status={ticket.status || 'valid'} />
                      </div>
                    </button>
                  );
                })}
              </Card>
            )}
          </div>
        </div>
      );
    }

    if (visibleTab === 'transactions') {
      // Pure client-side filter over already-loaded trip data (no backend
      // pagination/search yet) — filters as-you-type with no explicit submit.
      // If server-side search/pagination is introduced later, this should
      // become a debounced API call instead of a direct .filter().
      const historyQuery = historySearch.trim().toLowerCase();
      const filteredTransactions = historyQuery
        ? transactions.filter((payment) => {
          const haystack = [
            payment.route_summary,
            payment.transaction_reference,
            payment.payment_uuid,
            payment.payment_channel,
            payment.payment_method,
          ].filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(historyQuery);
        })
        : transactions;

      return (
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Transaction History</h1>
          <SearchBar
            value={historySearch}
            onChange={setHistorySearch}
            placeholder="Search by route or bus operator..."
            className="mt-4 max-w-md"
          />

          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3">Route</th>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Channel</th>
                    <th className="px-5 py-3">Amount Paid</th>
                    <th className="px-5 py-3">Rewards Used</th>
                    <th className="px-5 py-3">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingPrivate ? (
                    <tr><td colSpan={7} className="px-5 py-4 text-slate-500">Loading transaction history...</td></tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-4 text-slate-500">
                        {historyQuery ? 'No transactions match your search.' : 'No transaction records yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((payment, idx) => (
                      <tr key={payment.payment_id ?? payment.payment_uuid ?? idx}>
                        <td className="px-5 py-3.5 font-medium text-navy-950">{payment.route_summary || 'Route unavailable'}</td>
                        <td className="px-5 py-3.5 text-slate-500">{formatDateTime(payment.paid_at)}</td>
                        <td className="px-5 py-3.5 text-slate-500">{payment.transaction_reference || payment.payment_uuid || '-'}</td>
                        <td className="px-5 py-3.5 text-slate-500">{payment.payment_channel || payment.payment_method || '-'}</td>
                        <td className="px-5 py-3.5 font-semibold text-navy-950">PHP {Number(payment.amount ?? 0).toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-slate-500">{Number(payment.reward_points_redeemed ?? 0).toFixed(0)} pts</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={payment.status || '-'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      );
    }

    if (visibleTab === 'rewards') {
      return (
        <div className="space-y-6">
          <Card className="!bg-navy-900 p-6 text-white sm:p-8">
            <p className="text-sm text-navy-200">Your Rewards Points</p>
            <p className="mt-1 font-display text-4xl font-bold">{Number(numericPoints).toFixed(0)} pts</p>
            <p className="mt-1 text-sm text-teal-300">Current Tier: Silver Rider</p>
            <div className="mt-4 max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(100, (numericPoints / 500) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-navy-200">{Number(numericPoints).toFixed(0)} / 500 pts to Gold Rider</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-navy-950">How SmartPoints Work</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Buy a ticket → earn SmartPoints → save your points → use them to reduce the cost of your next SmartTransit ticket.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-navy-950">1. Earn</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">₱1 spent on a ticket = 1 SmartPoint, added automatically after a successful payment.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-navy-950">2. Save</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Once you reach 100 points, they're ready to use on any future ticket.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-navy-950">3. Use</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">1 SmartPoint = ₱1 off. Switch on "Use SmartPoints" at checkout to apply it automatically.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-navy-950">Available Rewards</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {rewardCatalog.map((item) => {
                const canRedeem = numericPoints >= item.cost;
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-navy-950">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <strong className="text-sm font-semibold text-navy-950">{item.cost} pts</strong>
                      <Button variant={canRedeem ? 'primary' : 'secondary'} size="xs" disabled={!canRedeem}>
                        {canRedeem ? 'Redeem' : 'Not enough points'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-navy-950">Rewards Activity</h2>
            {rewards.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No reward transactions found.</p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {rewards.map((reward, idx) => {
                  const pointsValue = Number(reward?.points ?? reward?.points_amount ?? 0);
                  const isEarned = pointsValue >= 0;
                  return (
                    <div key={reward.reward_transaction_id ?? idx} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isEarned ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isEarned ? '+' : '−'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy-950">{reward?.description || (isEarned ? 'Ticket purchase' : 'Used for ticket discount')}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(reward.created_at ?? reward.transaction_date)}</p>
                      </div>
                      <strong className={`shrink-0 text-sm font-semibold ${isEarned ? 'text-teal-700' : 'text-slate-500'}`}>
                        {`${isEarned ? '+' : ''}${Number.isFinite(pointsValue) ? pointsValue.toFixed(0) : '0'} pts`}
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      );
    }

    if (visibleTab === 'profile') {
      const initial = (profile?.name || user?.name || 'P').charAt(0).toUpperCase();
      return (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-400 font-display text-2xl font-bold text-navy-900">
                {initial}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-navy-950">{profile?.name || user?.name || '-'}</p>
                <p className="text-sm text-slate-500">{profile?.user?.email || user?.email || '-'}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Contact Number</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-950">{profile?.phone_num || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Address</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-950">{profile?.address || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Rewards Points</p>
                <p className="mt-0.5 text-sm font-semibold text-navy-950">{points}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            {profile ? (
              <Toggle
                checked={twoFactorEnabled}
                onChange={handleTwoFactorToggle}
                disabled={updating2fa}
                label="Login 2FA"
                description="Require a 6-digit OTP during sign-in."
              />
            ) : (
              <p className="text-sm text-slate-500">Loading…</p>
            )}
            {twoFactorMsg && <p className="mt-2 text-xs font-medium text-teal-700">{twoFactorMsg}</p>}
          </Card>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-900 p-5 transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-64 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Bus size={20} />
            </span>
            <span className="font-display text-base font-bold">SmartTransit</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-6 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => { setMenuOpen(false); navigate('/'); }}
            className={navLinkClasses(false)}
          >
            <House size={19} />
            Homepage
          </button>
        </div>

        <p className="mt-4 px-3.5 text-xs font-semibold uppercase tracking-wider text-navy-400">Main</p>
        <nav className="mt-2 flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon, protected: needsAuth }) => (
            <button
              key={key}
              type="button"
              className={navLinkClasses(visibleTab === key)}
              onClick={() => handleTabChange({ key, protected: needsAuth })}
              onMouseEnter={key === 'map' ? () => { void preloadMapView(); } : undefined}
              onFocus={key === 'map' ? () => { void preloadMapView(); } : undefined}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <button
            type="button"
            className={navLinkClasses(visibleTab === 'profile')}
            onClick={() => handleTabChange({ key: 'profile', protected: true })}
          >
            <User size={18} />
            Profile
          </button>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-white/10"
            >
              <LogOut size={18} />
              Logout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/passenger/login')}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-navy-200 hover:bg-white/10"
            >
              <User size={18} />
              Sign In
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button type="button" className="rounded-lg p-2 text-navy-900" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
          <span className="font-display text-sm font-bold text-navy-900">SmartTransit</span>
          <span className="w-8" aria-hidden="true" />
        </div>

        <header className="sticky top-0 z-30 hidden h-16 items-center justify-end border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:h-20 sm:px-8 lg:flex">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hidden items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy-900 sm:flex"
            >
              <House size={14} />
              Landing Page
            </button>
            <button
              type="button"
              onClick={() => handleTabChange({ key: 'rewards', protected: true })}
              className="hidden items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 sm:flex"
            >
              {Number(points).toFixed(0)} pts
            </button>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </button>
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <Button to="/passenger/login" variant="primary" size="sm">Log In</Button>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {paymentNotice && (
            <div className="mb-4 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 ring-1 ring-inset ring-teal-200">
              {paymentNotice}
            </div>
          )}
          {privateError && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200">
              {privateError}
            </div>
          )}
          {lastSync && isAuthenticated && (
            <p className="mb-4 text-xs text-slate-400">Last sync: {formatDateTime(lastSync)}</p>
          )}

          {renderContent()}
        </main>
      </div>

      <Modal open={ticketModalOpen && Boolean(selectedTicket)} onClose={closeTicketModal} title="Ticket Details">
        {selectedTicket && (
          loadingTicketQr ? (
            <p className="text-sm text-slate-500">Loading QR ticket...</p>
          ) : (
            <>
              <TicketCard
                fromLabel={getOriginLabel(selectedTicket)}
                toLabel={getDestinationLabel(selectedTicket)}
                departureLabel={formatDateTime(selectedTicket.valid_from ?? selectedTicketQr?.valid_from)}
                seatLabel={selectedTicket.seat_type || '-'}
                routeLabel={`${getOriginLabel(selectedTicket)} to ${getDestinationLabel(selectedTicket)}`}
                qrUrl={selectedTicketQr?.qr_url || ''}
                statusLabel={selectedTicket.status || '-'}
                validLabel={formatDateTime(selectedTicket.valid_from ?? selectedTicketQr?.valid_from)}
                expiresLabel={formatDateTime(selectedTicket.expires_at ?? selectedTicketQr?.expires_at)}
              />
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Drop-off Location</p>
                <p className="mt-1 text-sm font-semibold text-navy-950">{getDestinationLabel(selectedTicket)}</p>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={printSelectedTicket}>Print PDF</Button>
                <Button type="button" variant="primary" size="sm" onClick={closeTicketModal}>Close</Button>
              </div>
            </>
          )
        )}
      </Modal>
    </div>
  );
}
