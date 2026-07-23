import { Suspense, lazy } from 'react';
import { Bell, Map, Ticket, User, LogOut, Gift, History, ShoppingCart, Menu } from 'lucide-react';
import usePassengerDashboard from '../../../api/hooks/Passenger/usePassengerDashboard';
import TicketCard from '../Ticket/TicketCard';
import './PassengerPortal.css';

const preloadMapView = () =>
  Promise.all([
    import('../../Map/mapDependencies').then((mod) => mod.preloadMapDependencies()),
    import('../../Map/MapView.web'),
  ]).then(([, mod]) => mod);

const MapView = lazy(() => preloadMapView());
const BuyTicket = lazy(() => import('../BuyTicket/BuyTicket'));

const NAV_ITEMS = [
  { key: 'buy', label: 'Home', icon: ShoppingCart, protected: false },
  { key: 'rewards', label: 'Rewards', icon: Gift, protected: true },
  { key: 'tickets', label: 'My Ticket', icon: Ticket, protected: true },
  { key: 'transactions', label: 'Transaction History', icon: History, protected: true },
  { key: 'profile', label: 'My Profile', icon: User, protected: true },
  { key: 'map', label: 'Live Map', icon: Map, protected: false },
];

const PROTECTED_TABS = new Set(['tickets', 'rewards', 'transactions', 'profile']);

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

  const renderContent = () => {
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
        <div className="passenger-map-wrap">
          <Suspense fallback={tabFallback}>
            <MapView role="passenger" />
          </Suspense>
        </div>
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
      return (
        <section className="passenger-panel">
          <div className="passenger-panel-head">
            <h2>My Tickets</h2>
          </div>
          {isLoadingPrivate ? (
            <p className="passenger-muted">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="passenger-muted">No active tickets available yet.</p>
          ) : (
            <div className="passenger-ticket-list">
              {tickets.map((ticket, idx) => (
                <button
                  key={ticket.ticket_id ?? ticket.ticket_uuid ?? idx}
                  type="button"
                  className="passenger-ticket-item passenger-ticket-button"
                  onClick={() => {
                    void openTicketModal(ticket);
                  }}
                >
                  <span>{idx + 1}.</span>
                  <div>
                    <strong>{getOriginLabel(ticket)} to {getDestinationLabel(ticket)}</strong>
                    <p className="passenger-ticket-meta">Booked: {formatDateTime(ticket?.created_at)}</p>
                  </div>
                  <em>{ticket.status || 'issued'}</em>
                </button>
              ))}
            </div>
          )}
        </section>
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
                <th>Gross Amount</th>
                <th>Rewards Used</th>
                <th>Net Paid</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPrivate ? (
                <tr>
                  <td colSpan={8}>Loading transaction history...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8}>No transaction records yet.</td>
                </tr>
              ) : (
                transactions.map((payment, idx) => (
                  <tr key={payment.payment_id ?? payment.payment_uuid ?? idx}>
                    <td>{payment.route_summary || 'Route unavailable'}</td>
                    <td>{formatDateTime(payment.paid_at)}</td>
                    <td>{payment.transaction_reference || payment.payment_uuid || '-'}</td>
                    <td>{payment.payment_channel || payment.payment_method || '-'}</td>
                    <td>PHP {Number(payment.gross_amount ?? payment.amount ?? 0).toFixed(2)}</td>
                    <td>{Number(payment.reward_points_redeemed ?? 0).toFixed(0)} pts</td>
                    <td>PHP {Number(payment.amount ?? 0).toFixed(2)}</td>
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
        <section className="passenger-grid-two">
          <article className="passenger-highlight">
            <h3>{profile?.name || user?.name || 'Passenger'}</h3>
            <p>{profile?.user?.email || user?.email || ''}</p>
          </article>
          <article className="passenger-highlight">
            <h3>Rewards Points</h3>
            <p>{points}</p>
          </article>
          <article className="passenger-panel span-two">
            <div className="passenger-panel-head">
              <h2>Rewards Activity</h2>
            </div>
            {rewards.length === 0 ? (
              <p className="passenger-muted">No reward transactions found.</p>
            ) : (
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
        </section>
      );
    }

    return null;
  };

  return (
    <div className="passenger-shell">
      <aside className={`passenger-sidebar ${menuOpen ? 'open' : ''}`}>
        <button className="passenger-close" onClick={() => setMenuOpen(false)}>Close</button>
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
          {isAuthenticated ? (
            <button className="passenger-nav-item" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          ) : (
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
            <Bell size={14} />
            <span>{points} points</span>
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
                  <TicketCard
                    fromLabel={getOriginLabel(selectedTicket)}
                    toLabel={getDestinationLabel(selectedTicket)}
                    departureLabel={formatDateTime(selectedTicket.valid_from ?? selectedTicketQr?.valid_from)}
                    seatLabel={selectedTicket.seat_type || '-'}
                    routeLabel={`${getOriginLabel(selectedTicket)} to ${getDestinationLabel(selectedTicket)}`}
                    qrUrl={selectedTicketQr?.qr_url || ''}
                    statusLabel={selectedTicket.status || '-'}
                    amountLabel={`PHP ${Number(selectedTicket.amount ?? selectedTicket.final_amount ?? 0).toFixed(2)}`}
                    validLabel={formatDateTime(selectedTicket.valid_from ?? selectedTicketQr?.valid_from)}
                    expiresLabel={formatDateTime(selectedTicket.expires_at ?? selectedTicketQr?.expires_at)}
                  />
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
