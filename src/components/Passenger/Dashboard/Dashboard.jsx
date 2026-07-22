import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Ticket, User, LogOut, Activity, Gift, RefreshCw } from 'lucide-react';
import MapView from '../../Map/MapView.web';
import Profile from '../Profile/Profile';
import { useAuth } from '../../../api/hooks/useAuth';
import PassengerService from '../../../api/PassengerService/PassengerService';

const NAV_ITEMS = [
    { key: 'overview', label: 'Overview', icon: Activity },
    { key: 'map', label: 'Live Map', icon: Map },
    { key: 'tickets', label: 'Tickets', icon: Ticket },
    { key: 'rewards', label: 'Rewards', icon: Gift },
    { key: 'profile', label: 'Profile', icon: User },
];

function PageHeader({ title, subtitle }) {
    const [time, setTime] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
                <h1 className="text-lg font-semibold text-white">{title}</h1>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
            <div className="font-data rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [profile, setProfile] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastSync, setLastSync] = useState(null);

    const loadObjectiveData = useCallback(async () => {
        setIsLoading(true);
        setError('');

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
            setError(failures.join(' | '));
        }

        setLastSync(new Date());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadObjectiveData();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadObjectiveData]);

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    const hasTickets = tickets.length > 0;
    const hasRewards = rewards.length > 0;
    const profileReady = !!(profile || user);

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* ── Sidebar: rendered as a metro line, nav items as stations ── */}
            <aside className="flex w-72 flex-col justify-between border-r border-slate-800 bg-slate-950 p-5">
                <div>
                    <h2 className="px-2 text-xl font-bold text-white">SmartTransit</h2>

                    <nav className="relative mt-10 flex flex-col gap-1 pl-3">
                        <div
                            className="absolute bottom-2 left-2 top-2 w-px bg-slate-800"
                            aria-hidden="true"
                        />

                        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
                            const isActive = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setActiveTab(key)}
                                    className="group relative flex items-center gap-3 rounded-lg py-2.5 pl-5 pr-3 text-left text-sm font-medium transition"
                                >
                                    <span
                                        className={[
                                            "absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border transition",
                                            isActive
                                                ? "border-sky-400 bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.25)]"
                                                : "border-slate-600 bg-slate-950 group-hover:border-slate-400",
                                        ].join(" ")}
                                        aria-hidden="true"
                                    />
                                    <Icon
                                        className={[
                                            "h-4 w-4",
                                            isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300",
                                        ].join(" ")}
                                    />
                                    <span className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"}>
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div>
                    <div className="mb-3 border-t border-dashed border-slate-800" aria-hidden="true" />
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm font-medium text-red-400 transition hover:bg-red-950/50 hover:text-red-300"
                    >
                        <LogOut className="h-4 w-4" />
                        Log Out
                    </button>
                </div>
            </aside>

            {/* ── Main Workspace ── */}
            <main className="flex-1">
                {activeTab === 'overview' && (
                    <div className="p-6">
                        <PageHeader title="Backend Objective Console" subtitle="Passenger API validation surface" />

                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={loadObjectiveData}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-600"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh Objective Data
                            </button>
                            {lastSync && (
                                <span className="text-xs text-slate-500">
                                    Last sync: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            )}
                        </div>

                        {error && (
                            <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
                                Loading objective metrics...
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Objective 1</p>
                                        <h3 className="mt-1 text-sm font-semibold text-white">Profile Accuracy</h3>
                                        <p className="mt-2 text-sm text-slate-400">Endpoint: /passengers/profile</p>
                                        <p className="mt-2 text-sm text-slate-300">Status: {profileReady ? 'Available' : 'Unavailable'}</p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Objective 2</p>
                                        <h3 className="mt-1 text-sm font-semibold text-white">Ticket Retrieval</h3>
                                        <p className="mt-2 text-sm text-slate-400">Endpoint: /passengers/tickets</p>
                                        <p className="mt-2 text-sm text-slate-300">Records: {tickets.length}</p>
                                        <p className="mt-1 text-sm text-slate-300">Status: {hasTickets ? 'Data returned' : 'No records yet'}</p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Objective 3</p>
                                        <h3 className="mt-1 text-sm font-semibold text-white">Rewards History</h3>
                                        <p className="mt-2 text-sm text-slate-400">Endpoint: /passengers/rewards/history</p>
                                        <p className="mt-2 text-sm text-slate-300">Records: {rewards.length}</p>
                                        <p className="mt-1 text-sm text-slate-300">Status: {hasRewards ? 'Data returned' : 'No records yet'}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                                    <h4 className="text-sm font-semibold text-white">Testing Notes</h4>
                                    <ul className="mt-2 space-y-1 text-sm text-slate-400">
                                        <li>Use this screen to verify API data presence before UI workflow testing.</li>
                                        <li>Move to Tickets tab to validate ticket fields and status values.</li>
                                        <li>Move to Rewards tab to verify chronological reward transactions.</li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'map' && (
                    <div className="h-screen overflow-hidden">
                        <MapView role="passenger" />
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className="p-6">
                        <PageHeader title="Ticket Validation" subtitle="Dataset from /passengers/tickets" />
                        {isLoading ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">Loading tickets...</div>
                        ) : tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
                                <Ticket className="h-8 w-8 text-slate-600" />
                                <p className="mt-3 text-sm font-medium text-slate-300">No tickets yet</p>
                                <p className="mt-1 text-sm text-slate-500">Backend is reachable but no ticket records were returned for this passenger.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
                                <table className="min-w-full divide-y divide-slate-800 text-sm">
                                    <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">Ticket UUID</th>
                                            <th className="px-4 py-3">Seat Type</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-slate-300">
                                        {tickets.map((ticket, idx) => (
                                            <tr key={ticket.ticket_id ?? ticket.ticket_uuid ?? idx}>
                                                <td className="px-4 py-3 font-mono text-xs">{ticket.ticket_uuid ?? ticket.uuid ?? 'n/a'}</td>
                                                <td className="px-4 py-3">{ticket.seat_type ?? 'n/a'}</td>
                                                <td className="px-4 py-3">{ticket.final_amount ?? ticket.amount ?? 'n/a'}</td>
                                                <td className="px-4 py-3">{ticket.status ?? 'n/a'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'rewards' && (
                    <div className="p-6">
                        <PageHeader title="Rewards Verification" subtitle="Dataset from /passengers/rewards/history" />
                        {isLoading ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-sm text-slate-400">Loading rewards...</div>
                        ) : rewards.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-sm text-slate-400">
                                No reward transactions returned for this account.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rewards.map((reward, idx) => (
                                    <div key={reward.reward_transaction_id ?? idx} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-white">{reward.transaction_type ?? 'Reward Transaction'}</p>
                                            <span className="text-xs text-slate-400">{reward.created_at ?? reward.transaction_date ?? 'date unavailable'}</span>
                                        </div>
                                        <div className="mt-2 grid gap-1 text-sm text-slate-300">
                                            <p>Points: {reward.points ?? reward.points_amount ?? 'n/a'}</p>
                                            {reward.description && <p>Notes: {reward.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="max-w-xl p-6">
                        <PageHeader title="Profile" subtitle="Your account details" />
                        <Profile />
                    </div>
                )}
            </main>
        </div>
    );
}