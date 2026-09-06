import { Suspense, lazy, useState } from 'react';
import { Bell, Map, Ticket, User, LogOut, Gift, History, ShoppingCart, Menu, House } from 'lucide-react';
import usePassengerDashboard from '../../../api/hooks/Passenger/usePassengerDashboard';
import PassengerService from '../../../api/PassengerService/PassengerService';
import TicketCard from '../Ticket/TicketCard';
import PublicTrackingSection from '../LandingPage/PublicTrackingSection';
import './PassengerPortal.css';

const preloadMapView = () =>
  Promise.all([
    import('../../Map/mapDependencies').then((mod) => mod.preloadMapDependencies()),
    import('../../Map/MapView.web'),
  ]).then(([, mod]) => mod);

const BuyTicket = lazy(() => import('../BuyTicket/BuyTicket'));

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: ShoppingCart, protected: false },
  { key: 'tickets', label: 'My Tickets', icon: Ticket, protected: true },
  { key: 'transactions', label: 'Trip History', icon: History, protected: true },
  { key: 'map', label: 'Track Bus', icon: Map, protected: false },
  { key: 'rewards', label: 'Rewards', icon: Gift, protected: true },
];

const PROTECTED_TABS = new Set(['tickets', 'rewards', 'transactions', 'profile']);

// ─── Group order card ────────────────────────────────────────────────────────
function GroupOrderCard({ tickets, onCardClick, openTicketModal, getOriginLabel, getDestinationLabel, formatDateTime }) {
  const transRef = tickets[0]?.payment?.transaction_reference ?? '';
  const groupQrUrl = transRef
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`grp:${transRef}`)}`
    : null;
  const allBoarded = tickets.every((t) => t.status === 'boarded');
  const anyBoarded = tickets.some((t) => t.status === 'boarded');
  const groupStatus = allBoarded ? 'boarded' : anyBoarded ? 'partial' : 'valid';
  const statusColors = {
    boarded: { bg: 'rgba(14,165,233,0.1)', border: 'rgba(56,189,248,0.3)', color: '#38bdf8', label: 'All Boarded' },
    partial: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', label: 'Partially Boarded' },
    valid:   { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', color: '#34d399', label: 'Ready to Board' },
  };
  const sc = statusColors[groupStatus];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(); }}
      style={{ border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px', background: 'rgba(15,23,42,0.6)', overflow: 'hidden', marginBottom: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(56,189,248,0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; }}
    >
      {/* Card header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(148,163,184,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
            Group Order — {tickets.length} Ticket{tickets.length > 1 ? 's' : ''}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
            {transRef ? transRef.slice(0, 20) + (transRef.length > 20 ? '…' : '') : 'No ref'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, fontWeight: 700 }}>
            {sc.label}
          </span>
        </div>
      </div>

      {/* Body: QR + ticket list */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0' }}>
        {/* Group QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', borderRight: '1px solid rgba(148,163,184,0.1)', background: 'rgba(255,255,255,0.03)' }}>
          {groupQrUrl ? (
            <>
              <img src={groupQrUrl} alt="Group QR" style={{ width: '96px', height: '96px', borderRadius: '6px', background: '#fff' }} />
              <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: '#64748b', textAlign: 'center' }}>Group QR</p>
            </>
          ) : (
            <p style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>QR unavailable</p>
          )}
        </div>

        {/* Ticket rows */}
        <div style={{ padding: '8px' }}>
          {tickets.map((ticket, i) => (
            <button
              key={ticket.ticket_id ?? ticket.ticket_uuid ?? i}
              type="button"
              onClick={(e) => { e.stopPropagation(); void openTicketModal(ticket); }}
              style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '6px', padding: '6px 8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: i < tickets.length - 1 ? '4px' : '0' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
                  {getOriginLabel(ticket)} → {getDestinationLabel(ticket)}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                  {ticket.seat_type || 'seated'} · {formatDateTime(ticket.valid_from)}
                </p>
              </div>
              <span style={{
                fontSize: '0.68rem', padding: '2px 7px', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 600,
                background: ticket.status === 'boarded' ? 'rgba(14,165,233,0.12)' : ticket.status === 'alighted' ? 'rgba(148,163,184,0.12)' : 'rgba(52,211,153,0.12)',
                color: ticket.status === 'boarded' ? '#38bdf8' : ticket.status === 'alighted' ? '#94a3b8' : '#34d399',
                border: ticket.status === 'boarded' ? '1px solid rgba(56,189,248,0.25)' : ticket.status === 'alighted' ? '1px solid rgba(148,163,184,0.25)' : '1px solid rgba(52,211,153,0.25)',
              }}>
                {ticket.status || 'issued'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket tab with filters ──────────────────────────────────────────────────
function TicketTabWithFilter({
  tickets,
  isLoadingPrivate,
  refCounts,
  hasGroupTickets,
  openTicketModal,
  getOriginLabel,
  getDestinationLabel,
  formatDateTime,
}) {
  const [filter, setFilter] = useState('all');
  const [groupModal, setGroupModal] = useState(null); // null | ticket[]

  // Build group orders map for the 'group' view
  const groupOrders = {};
  tickets.forEach((t) => {
    const ref = t?.payment?.transaction_reference;
    if (ref && (refCounts[ref] ?? 1) > 1) {
      if (!groupOrders[ref]) groupOrders[ref] = [];
      groupOrders[ref].push(t);
    }
  });

  const FILTERS = [
    { id: 'all',     label: 'All' },
    { id: 'single',  label: 'Single QR' },
    ...(hasGroupTickets ? [{ id: 'group', label: 'Group QR' }] : []),
    { id: 'valid',   label: 'Valid' },
    { id: 'boarded', label: 'Boarded' },
  ];

  // For non-group filters: list of individual tickets
  const individualTickets = tickets.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'single') {
      const ref = t?.payment?.transaction_reference;
      return !ref || (refCounts[ref] ?? 1) === 1;
    }
    if (filter === 'valid')   return (t.status || 'valid') === 'valid';
    if (filter === 'boarded') return t.status === 'boarded';
    return false;
  });

  const isGroupView = filter === 'group';
  const groupList = Object.values(groupOrders);
  const noResults = isGroupView ? groupList.length === 0 : individualTickets.length === 0;

  const emptyMsg = tickets.length === 0
    ? 'No tickets available yet.'
    : `No ${filter === 'boarded' ? 'boarded' : filter === 'valid' ? 'valid' : filter === 'single' ? 'single QR' : filter === 'group' ? 'group' : ''} tickets found.`;

  // Derive group modal display values
  const modalTransRef   = groupModal?.[0]?.payment?.transaction_reference ?? '';
  const modalGroupQrUrl = modalTransRef
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`grp:${modalTransRef}`)}`
    : null;

  return (
    <section className="passenger-panel">
      <div className="passenger-panel-head">
        <h2>My Tickets</h2>
      </div>

      {/* Filter pills */}
      {tickets.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              style={{
                padding: '4px 14px',
                borderRadius: '20px',
                border: filter === f.id ? '1px solid #38bdf8' : '1px solid rgba(148,163,184,0.3)',
                background: filter === f.id ? 'rgba(56,189,248,0.12)' : 'transparent',
                color: filter === f.id ? '#38bdf8' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: filter === f.id ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {isLoadingPrivate ? (
        <p className="passenger-muted">Loading tickets...</p>
      ) : noResults ? (
        <p className="passenger-muted">{emptyMsg}</p>
      ) : isGroupView ? (
        // ── Group QR view ────────────────────────────────────────────────────
        <div>
          {groupList.map((groupTickets, idx) => (
            <GroupOrderCard
              key={groupTickets[0]?.payment?.transaction_reference ?? idx}
              tickets={groupTickets}
              refCounts={refCounts}
              onCardClick={() => setGroupModal(groupTickets)}
              openTicketModal={openTicketModal}
              getOriginLabel={getOriginLabel}
              getDestinationLabel={getDestinationLabel}
              formatDateTime={formatDateTime}
            />
          ))}
        </div>
      ) : (
        // ── Individual ticket list ────────────────────────────────────────────
        <div className="passenger-ticket-list">
          {individualTickets.map((ticket, idx) => {
            const ref = ticket?.payment?.transaction_reference;
            const isPartOfGroup = ref && (refCounts[ref] ?? 1) > 1;
            return (
              <button
                key={ticket.ticket_id ?? ticket.ticket_uuid ?? idx}
                type="button"
                className="passenger-ticket-item passenger-ticket-button"
                onClick={() => { void openTicketModal(ticket); }}
              >
                <span>{idx + 1}.</span>
                <div>
                  <strong>{getOriginLabel(ticket)} to {getDestinationLabel(ticket)}</strong>
                  <p className="passenger-ticket-meta">Booked: {formatDateTime(ticket?.created_at)}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <em>{ticket.status || 'valid'}</em>
                  {isPartOfGroup && (
                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '10px', background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', whiteSpace: 'nowrap' }}>
                      Group order
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Group order modal ─────────────────────────────────────────────── */}
      {groupModal && (
        <div
          className="passenger-modal-backdrop"
          role="presentation"
          onClick={() => setGroupModal(null)}
        >
          <section
            className="passenger-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Group order details"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <header className="passenger-modal-head">
              <h3>Group Order — {groupModal.length} Ticket{groupModal.length > 1 ? 's' : ''}</h3>
              <button
                type="button"
                className="passenger-modal-close"
                onClick={() => setGroupModal(null)}
              >
                Close
              </button>
            </header>

            <div className="passenger-modal-body" style={{ overflowY: 'auto' }}>
              {/* Group QR */}
              {modalGroupQrUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
                  <img
                    src={modalGroupQrUrl}
                    alt="Group QR code"
                    className="passenger-modal-qr"
                    style={{ width: '200px', height: '200px' }}
                  />
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#5a7896', textAlign: 'center' }}>
                    Scan this QR to board all {groupModal.length} tickets at once
                  </p>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {modalTransRef}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: '1px solid #e0ebf8', margin: '4px 0' }} />

              {/* Ticket rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {groupModal.map((ticket, i) => (
                  <button
                    key={ticket.ticket_id ?? ticket.ticket_uuid ?? i}
                    type="button"
                    onClick={() => { setGroupModal(null); void openTicketModal(ticket); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dbe8f6', background: '#f7fbff', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#eaf3fd'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f7fbff'; }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#12365a' }}>
                        {getOriginLabel(ticket)} → {getDestinationLabel(ticket)}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#5a7896' }}>
                        {ticket.seat_type || 'seated'} · {formatDateTime(ticket.valid_from)}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.72rem', padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 700,
                      background: ticket.status === 'boarded' ? '#e0f2fe' : ticket.status === 'alighted' ? '#f1f5f9' : '#eaf9f0',
                      color: ticket.status === 'boarded' ? '#0369a1' : ticket.status === 'alighted' ? '#475569' : '#166534',
                      border: ticket.status === 'boarded' ? '1px solid #7dd3fc' : ticket.status === 'alighted' ? '1px solid #94a3b8' : '1px solid #9dd7af',
                    }}>
                      {ticket.status || 'valid'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Total removed — amounts visible in Transaction History */}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

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
    <section className="passenger-panel">
      <p className="passenger-muted">Loading section...</p>
    </section>
  );

  const [twoFactorOverride, setTwoFactorOverride] = useState(null);
  const [updating2fa, setUpdating2fa] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState('');

  const twoFactorEnabled = twoFactorOverride
    ?? profile?.user?.two_factor_enabled
    ?? profile?.two_factor_enabled
    ?? user?.two_factor_enabled
    ?? false;

  const handleTwoFactorToggle = async (event) => {
    const enabled = event.target.checked;
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

  const renderContent = () => {
    if (visibleTab === 'dashboard') {
      return (
        <section className="passenger-dashboard">
          <div className="passenger-dashboard-head">
            <h2>Welcome, {profile?.name || user?.name || 'Passenger'}!</h2>
            <p>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>

          <div className="passenger-kpi-row">
            <article className="passenger-kpi-card"><strong>{homeStats.upcomingTrips}</strong><span>Upcoming Trips</span></article>
            <article className="passenger-kpi-card"><strong>{homeStats.tripsCompleted}</strong><span>Trips Completed</span></article>
            <article className="passenger-kpi-card"><strong>{homeStats.nearbyRoutes}</strong><span>Active Routes Nearby</span></article>
          </div>

          <div className="passenger-home-grid">
            <section className="passenger-panel passenger-home-main">
              <div className="passenger-panel-head"><h2>Upcoming Trip</h2></div>
              {upcomingTicket ? (
                <div className="passenger-upcoming-strip">
                  <div>
                    <p>{getOriginLabel(upcomingTicket)} → {getDestinationLabel(upcomingTicket)}</p>
                    <span>{formatDateTime(upcomingTicket.valid_from || upcomingTicket.created_at)}</span>
                  </div>
                  <em>{String(upcomingTicket.status || 'confirmed')}</em>
                </div>
              ) : <p className="passenger-muted">No upcoming trip yet.</p>}

              <div className="passenger-panel-head" style={{ marginTop: '14px' }}><h2>Bus Schedule</h2></div>
              <table className="passenger-table">
                <thead><tr><th>Route</th><th>Departure</th><th>Bus</th></tr></thead>
                <tbody>
                  {tickets.slice(0, 5).map((ticket, idx) => (
                    <tr key={`sched-${ticket.ticket_id ?? idx}`}>
                      <td>{getOriginLabel(ticket)} → {getDestinationLabel(ticket)}</td>
                      <td>{formatDateTime(ticket.valid_from || ticket.created_at)}</td>
                      <td>{ticket?.trip?.fleet_route?.fleet?.plate_number || '-'}</td>
                    </tr>
                  ))}
                  {tickets.length === 0 && <tr><td colSpan={3}>No schedule data available yet.</td></tr>}
                </tbody>
              </table>

              <div className="passenger-panel-head" style={{ marginTop: '14px' }}><h2>Recent Bookings</h2></div>
              <table className="passenger-table">
                <thead><tr><th>Origin</th><th>Destination</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {recentBookings.map((payment, idx) => (
                    <tr key={`recent-${payment.payment_id ?? idx}`}>
                      <td>{getBookingLocationLabel(payment, 'origin')}</td>
                      <td>{getBookingLocationLabel(payment, 'destination')}</td>
                      <td>{formatDateTime(payment.paid_at)}</td>
                      <td>PHP {Number(payment.amount ?? 0).toFixed(2)}</td>
                      <td>{payment.status || '-'}</td>
                    </tr>
                  ))}
                  {recentBookings.length === 0 && <tr><td colSpan={5}>No bookings yet.</td></tr>}
                </tbody>
              </table>
            </section>

            <aside className="passenger-home-side">
              <section className="passenger-panel">
                <div className="passenger-panel-head"><h2>Quick Actions</h2></div>
                <div className="passenger-quick-actions">
                  <button className="passenger-secondary-btn" onClick={() => handleTabChange({ key: 'buy', protected: false })}>Book a New Trip</button>
                  <button className="passenger-secondary-btn" onClick={() => handleTabChange({ key: 'map', protected: false })}>Track My Bus</button>
                  <button className="passenger-secondary-btn" onClick={() => handleTabChange({ key: 'tickets', protected: true })}>View My Tickets</button>
                </div>
              </section>

              <section className="passenger-panel">
                <div className="passenger-panel-head"><h2>Active Routes</h2></div>
                {activeRoutes.length === 0 ? <p className="passenger-muted">No active routes found.</p> : (
                  <ul className="passenger-routes-list">
                    {activeRoutes.map((routeName) => <li key={routeName}>{routeName}</li>)}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </section>
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
      return (
        <section className="passenger-map-tab">
          <PublicTrackingSection showHeader={false} compact />
        </section>
      );
    }

    if (!isAuthenticated && PROTECTED_TABS.has(visibleTab)) {
      return (
        <section className="passenger-card">
          <h2>Authentication Required</h2>
          <p>Sign in to access this section.</p>
          <button className="passenger-primary-btn" onClick={() => navigate('/passenger/login')}>Sign In</button>
        </section>
      );
    }

    if (visibleTab === 'tickets') {
      const refCounts = {};
      tickets.forEach((t) => {
        const ref = t?.payment?.transaction_reference;
        if (ref) refCounts[ref] = (refCounts[ref] ?? 0) + 1;
      });
      const hasGroupTickets = Object.values(refCounts).some((c) => c > 1);

      return (
        <TicketTabWithFilter
          tickets={tickets}
          isLoadingPrivate={isLoadingPrivate}
          refCounts={refCounts}
          hasGroupTickets={hasGroupTickets}
          openTicketModal={openTicketModal}
          getOriginLabel={getOriginLabel}
          getDestinationLabel={getDestinationLabel}
          formatDateTime={formatDateTime}
        />
      );
    }

    if (visibleTab === 'transactions') {
      return (
        <section className="passenger-panel">
          <div className="passenger-panel-head">
            <h2>Transaction History</h2>
          </div>
          <table className="passenger-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Timestamp</th>
                <th>Reference</th>
                <th>Channel</th>
                <th>Amount Paid</th>
                <th>Rewards Used</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPrivate ? (
                <tr>
                  <td colSpan={7}>Loading transaction history...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7}>No transaction records yet.</td>
                </tr>
              ) : (
                transactions.map((payment, idx) => (
                  <tr key={payment.payment_id ?? payment.payment_uuid ?? idx}>
                    <td>{payment.route_summary || 'Route unavailable'}</td>
                    <td>{formatDateTime(payment.paid_at)}</td>
                    <td>{payment.transaction_reference || payment.payment_uuid || '-'}</td>
                    <td>{payment.payment_channel || payment.payment_method || '-'}</td>
                    <td>PHP {Number(payment.amount ?? 0).toFixed(2)}</td>
                    <td>{Number(payment.reward_points_redeemed ?? 0).toFixed(0)} pts</td>
                    <td>{payment.status || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      );
    }

    if (visibleTab === 'rewards') {
      return (
        <section className="passenger-rewards-page">
          <article className="passenger-rewards-banner">
            <div>
              <p>Your Rewards Points</p>
              <h2>{Number(numericPoints).toFixed(0)} pts</h2>
              <span>Current Tier: Silver Rider</span>
            </div>
            <div className="passenger-tier-meter">
              <div className="passenger-tier-meter-bar"><span style={{ width: `${Math.min(100, (numericPoints / 500) * 100)}%` }} /></div>
              <small>{Number(numericPoints).toFixed(0)} / 500 pts to Gold Rider</small>
            </div>
          </article>

          <article className="passenger-panel">
            <div className="passenger-panel-head"><h2>About Rewards</h2></div>
            <p className="passenger-muted">Earn points every time you complete a paid trip with SmartTransit. Redeem points for fare discounts and booking perks.</p>
          </article>

          <article className="passenger-panel">
            <div className="passenger-panel-head"><h2>Available Rewards</h2></div>
            <div className="passenger-reward-catalog">
              {rewardCatalog.map((item) => {
                const canRedeem = numericPoints >= item.cost;
                return (
                  <div key={item.id} className="passenger-reward-catalog-item">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div>
                      <strong>{item.cost} pts</strong>
                      <button type="button" disabled={!canRedeem}>{canRedeem ? 'Redeem' : 'Not enough points'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="passenger-panel">
            <div className="passenger-panel-head"><h2>Rewards Activity</h2></div>
            {rewards.length === 0 ? <p className="passenger-muted">No reward transactions found.</p> : (
              <div className="passenger-reward-list">
                {rewards.map((reward, idx) => (
                  <div key={reward.reward_transaction_id ?? idx} className="passenger-reward-item">
                    <strong>{reward.transaction_type ?? 'Reward transaction'}</strong>
                    <span>{reward.points ?? reward.points_amount ?? 0} points</span>
                    <em>{formatDateTime(reward.created_at ?? reward.transaction_date)}</em>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      );
    }

    if (visibleTab === 'profile') {
      return (
        <section className="passenger-panel">
          <div className="passenger-panel-head">
            <h2>My Profile</h2>
          </div>
          <div className="passenger-profile-grid">
            <div><span>Name</span><strong>{profile?.name || user?.name || '-'}</strong></div>
            <div><span>Email</span><strong>{profile?.user?.email || user?.email || '-'}</strong></div>
            <div><span>Contact Number</span><strong>{profile?.phone_num || '-'}</strong></div>
            <div><span>Address</span><strong>{profile?.address || '-'}</strong></div>
            <div><span>Rewards Points</span><strong>{points}</strong></div>
          </div>
          <div style={{ marginTop: '16px', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '12px', background: 'rgba(15,23,42,0.45)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>Login 2FA</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Require a 6-digit OTP during sign-in.</p>
              </div>
              {profile ? (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: updating2fa ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={handleTwoFactorToggle}
                    disabled={updating2fa}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>Loading…</span>
              )}
            </div>
            {twoFactorMsg && <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#7dd3fc' }}>{twoFactorMsg}</p>}
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="passenger-shell">
      <aside className={`passenger-sidebar ${menuOpen ? 'open' : ''}`}>
        <button className="passenger-close" onClick={() => setMenuOpen(false)}>Close</button>
        <div className="passenger-brand">SmartTransit</div>
        <p className="passenger-nav-title">MAIN</p>
        <nav>
          {NAV_ITEMS.map(({ key, label, icon: Icon, protected: needsAuth }) => (
            <button
              key={key}
              className={`passenger-nav-item ${visibleTab === key ? 'active' : ''}`}
              onClick={() => handleTabChange({ key, protected: needsAuth })}
              onMouseEnter={key === 'map' ? () => { void preloadMapView(); } : undefined}
              onFocus={key === 'map' ? () => { void preloadMapView(); } : undefined}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="passenger-sidebar-bottom">
          <button className={`passenger-nav-item ${visibleTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange({ key: 'profile', protected: true })}>
            <User size={16} />
            <span>Profile</span>
          </button>
          {isAuthenticated
            ? (
              <button className="passenger-nav-item" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            )
            : (
              <button className="passenger-nav-item" onClick={() => navigate('/passenger/login')}>
                <User size={16} />
                <span>Sign In</span>
              </button>
            )}
        </div>
      </aside>

      <main className="passenger-main">
        <header className="passenger-topbar">
          <button className="passenger-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} />
          </button>
          <div className="passenger-logo">SmartTransit</div>
          <div className="passenger-top-actions">
            <button type="button" className="passenger-landing-btn" onClick={() => navigate('/')}>
              <House size={14} />
              <span>Landing Page</span>
            </button>
            <span className="passenger-points-chip">{Number(points).toFixed(0)} pts</span>
            <Bell size={14} />
            <span className="passenger-avatar">J</span>
          </div>
        </header>

        {paymentNotice && <div className="passenger-notice">{paymentNotice}</div>}
        {privateError && <div className="passenger-error">{privateError}</div>}
        {lastSync && isAuthenticated && <p className="passenger-last-sync">Last sync: {formatDateTime(lastSync)}</p>}

        {renderContent()}

        {ticketModalOpen && selectedTicket && (
          <div className="passenger-modal-backdrop" role="presentation" onClick={closeTicketModal}>
            <section
              className="passenger-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Ticket details"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="passenger-modal-head">
                <h3>Ticket Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="passenger-modal-close" onClick={printSelectedTicket} aria-label="Print ticket">
                    Print PDF
                  </button>
                  <button type="button" className="passenger-modal-close" onClick={closeTicketModal} aria-label="Close ticket details">
                    Close
                  </button>
                </div>
              </header>

              <div className="passenger-modal-body">
                {loadingTicketQr ? (
                  <p className="passenger-muted">Loading QR ticket...</p>
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
                    <div
                      style={{
                        marginTop: '10px',
                        border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        background: 'rgba(15,23,42,0.45)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>Drop-off Location</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.92rem', color: '#e2e8f0', fontWeight: 600 }}>
                        {getDestinationLabel(selectedTicket)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
