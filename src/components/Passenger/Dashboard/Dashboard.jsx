import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Map, Ticket, User, LogOut, Gift, History, ShoppingCart, Menu } from 'lucide-react';
import MapView from '../../Map/MapView.web';
import { useAuth } from '../../../api/hooks/useAuth';
import PassengerService from '../../../api/PassengerService/PassengerService';
import BuyTicket from '../BuyTicket/BuyTicket';
import './PassengerPortal.css';

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
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { logout, user, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState('buy');
    const [menuOpen, setMenuOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);
    const [privateError, setPrivateError] = useState('');
    const [lastSync, setLastSync] = useState(null);
    const [paymentNotice, setPaymentNotice] = useState('');

    const loadPrivateData = useCallback(async () => {
        if (!isAuthenticated) {
            setProfile(null);
            setTickets([]);
            setRewards([]);
            setLastSync(null);
            return;
        }

        setIsLoadingPrivate(true);
        setPrivateError('');

        const [profileRes, ticketsRes, rewardsRes] = await Promise.allSettled([
            PassengerService.getProfile(),
            PassengerService.getTickets(),
            PassengerService.getRewardsHistory(),
        ]);

        const failures = [];

        if (profileRes.status === 'fulfilled') {
            setProfile(profileRes.value?.data ?? profileRes.value ?? null);
        } else {
            setProfile(null);
            failures.push('Profile endpoint failed');
        }

        if (ticketsRes.status === 'fulfilled') {
            const ticketList = ticketsRes.value?.data ?? ticketsRes.value ?? [];
            setTickets(Array.isArray(ticketList) ? ticketList : []);
        } else {
            setTickets([]);
            failures.push('Tickets endpoint failed');
        }

        if (rewardsRes.status === 'fulfilled') {
            const rewardList = rewardsRes.value?.data ?? rewardsRes.value ?? [];
            setRewards(Array.isArray(rewardList) ? rewardList : []);
        } else {
            setRewards([]);
            failures.push('Rewards endpoint failed');
        }

        if (failures.length > 0) {
            setPrivateError(failures.join(' | '));
        }

        setLastSync(new Date());
        setIsLoadingPrivate(false);
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            void loadPrivateData();
        } else {
            setIsLoadingPrivate(false);
            setPrivateError('');
            setProfile(null);
            setTickets([]);
            setRewards([]);
            setLastSync(null);
        }
    }, [isAuthenticated, loadPrivateData]);

    useEffect(() => {
        if (!isAuthenticated && PROTECTED_TABS.has(activeTab)) {
            setActiveTab('overview');
        }
    }, [isAuthenticated, activeTab]);

    useEffect(() => {
        const paymentStatus = searchParams.get('payment');
        if (!paymentStatus) {
            return;
        }

        if (paymentStatus === 'success') {
            setPaymentNotice('Payment successful. You have been redirected back.');
            if (isAuthenticated) {
                void loadPrivateData();
            }
        } else if (paymentStatus === 'cancel') {
            setPaymentNotice('Payment was cancelled. You can try checkout again.');
        }

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('payment');
        setSearchParams(nextParams, { replace: true });
    }, [isAuthenticated, loadPrivateData, searchParams, setSearchParams]);

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    const handleTabChange = (item) => {
        if (item.protected && !isAuthenticated) {
            navigate('/passenger/login');
            return;
        }
        setActiveTab(item.key);
        setMenuOpen(false);
    };

    const points = Number(profile?.reward_points ?? user?.reward_points ?? 0).toFixed(2);

    const renderContent = () => {
        if (activeTab === 'buy') {
            return (
                <BuyTicket onTicketPurchased={() => {
                    if (isAuthenticated) {
                        void loadPrivateData();
                    }
                }} />
            );
        }

        if (activeTab === 'map') {
            return (
                <div className="passenger-map-wrap">
                    <MapView role="passenger" />
                </div>
            );
        }

        if (!isAuthenticated && PROTECTED_TABS.has(activeTab)) {
            return (
                <section className="passenger-card">
                    <h2>Authentication Required</h2>
                    <p>Sign in to access this section.</p>
                    <button className="passenger-primary-btn" onClick={() => navigate('/passenger/login')}>Sign In</button>
                </section>
            );
        }

        if (activeTab === 'tickets') {
            return (
                <section className="passenger-panel">
                    <div className="passenger-panel-head">
                        <h2>My Tickets</h2>
                    </div>
                    {isLoadingPrivate ? (
                        <p className="passenger-muted">Loading tickets...</p>
                    ) : tickets.length === 0 ? (
                        <p className="passenger-muted">No tickets found yet.</p>
                    ) : (
                        <div className="passenger-ticket-list">
                            {tickets.map((ticket, idx) => (
                                <div key={ticket.ticket_id ?? ticket.ticket_uuid ?? idx} className="passenger-ticket-item">
                                    <span>{idx + 1}.</span>
                                    <strong>{ticket.origin_stop?.stop_name || ticket.origin || 'Origin'} to {ticket.destination_stop?.stop_name || ticket.destination || 'Destination'}</strong>
                                    <em>{ticket.status || 'issued'}</em>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            );
        }

        if (activeTab === 'transactions') {
            return (
                <section className="passenger-panel">
                    <div className="passenger-panel-head">
                        <h2>Transaction History</h2>
                    </div>
                    <table className="passenger-table">
                        <thead>
                            <tr>
                                <th>Route</th>
                                <th>Departure</th>
                                <th>Reservation No.</th>
                                <th>Total Amount</th>
                                <th>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>No transaction records yet.</td>
                                </tr>
                            ) : (
                                tickets.map((ticket, idx) => (
                                    <tr key={ticket.ticket_id ?? ticket.ticket_uuid ?? idx}>
                                        <td>{ticket.origin_stop?.stop_name || ticket.origin || '-'} to {ticket.destination_stop?.stop_name || ticket.destination || '-'}</td>
                                        <td>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '-'}</td>
                                        <td>{ticket.ticket_uuid || ticket.uuid || '-'}</td>
                                        <td>PHP {Number(ticket.final_amount ?? ticket.amount ?? 0).toFixed(2)}</td>
                                        <td>{ticket.status || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>
            );
        }

        if (activeTab === 'rewards') {
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
                                        <em>{reward.created_at ?? reward.transaction_date ?? '-'}</em>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                </section>
            );
        }

        if (activeTab === 'profile') {
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
                            className={`passenger-nav-item ${activeTab === key ? 'active' : ''}`}
                            onClick={() => handleTabChange({ key, protected: needsAuth })}
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
                {lastSync && isAuthenticated && <p className="passenger-last-sync">Last sync: {lastSync.toLocaleTimeString()}</p>}

                {renderContent()}
            </main>
        </div>
    );
}