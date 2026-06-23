import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../../Map/MapView.web';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('map');

    const handleLogout = () => {
        localStorage.removeItem('passenger_token');
        sessionStorage.removeItem('passenger_token');
        navigate('/', { replace: true });
    };

    return (
        <div className="dashboard-layout">
            {/* ── Sidebar Column ── */}
            <aside className="sidebar">
                <div>
                    <h2>SmartTransit</h2>
                    <div className="sidebar-menu">
                        <button
                            onClick={() => setActiveTab('map')}
                            className={activeTab === 'map' ? 'active' : ''}
                        >
                            🗺️ Live Map
                        </button>
                        <button
                            onClick={() => setActiveTab('tickets')}
                            className={activeTab === 'tickets' ? 'active' : ''}
                        >
                            🎫 Tickets
                        </button>
                    </div>
                </div>
                <button onClick={handleLogout} className="logout-btn">🚪 Log Out</button>
            </aside>

            {/* ── Main Workspace ── */}
            <main className="main-content">
                {activeTab === 'map' && (
                    /* The individual constrained layout box container card */
                    <div className="map-wrapper-box">
                        <MapView role="passenger" />
                    </div>
                )}

                {activeTab === 'tickets' && (
                    <div style={{ padding: '20px', color: '#fff' }}>
                        <h3>My QR Tickets</h3>
                    </div>
                )}
            </main>
        </div>
    );
}