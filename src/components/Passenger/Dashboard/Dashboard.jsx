import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Ticket, User, LogOut } from 'lucide-react';
import MapView from '../../Map/MapView.web';
import Profile from '../Profile/Profile'; // src/components/Passenger/Dashboard/ → src/components/Passenger/Profile/Profile.jsx
import { useAuth } from '../../../api/hooks/useAuth'; // src/components/Passenger/Dashboard/ → src/api/hooks/useAuth

const NAV_ITEMS = [
    { key: 'map', label: 'Live Map', icon: Map },
    { key: 'tickets', label: 'Tickets', icon: Ticket },
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
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('map');

    const handleLogout = async () => {
        await logout(); // clears storage AND updates AuthProvider's state correctly
        navigate('/', { replace: true });
    };

    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* ── Sidebar: rendered as a metro line, nav items as stations ── */}
            <aside className="flex w-72 flex-col justify-between border-r border-slate-800 bg-slate-950 p-5">
                <div>
                    <h2 className="px-2 text-xl font-bold text-white">SmartTransit</h2>

                    <nav className="relative mt-10 flex flex-col gap-1 pl-3">
                        <div
                            className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-800"
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
                {activeTab === 'map' && (
                    <div className="h-screen overflow-hidden">
                        <MapView role="passenger" />
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div className="p-6">
                        <PageHeader title="My QR Tickets" subtitle="Show these at the terminal to board" />
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
                            <Ticket className="h-8 w-8 text-slate-600" />
                            <p className="mt-3 text-sm font-medium text-slate-300">No tickets yet</p>
                            <p className="mt-1 text-sm text-slate-500">
                                Book a ride from Live Map to get your first QR ticket.
                            </p>
                        </div>
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