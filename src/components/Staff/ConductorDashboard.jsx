import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffService from '../../api/StaffService/StaffService';
import './StaffDashboard.css';

export default function ConductorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trip');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [pin, setPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [scanUuid, setScanUuid] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const hasActiveTrip = !!trip?.trip_id;
  const didBootstrap = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, tripRes, tripsRes] = await Promise.allSettled([
        StaffService.getProfile('conductor'),
        StaffService.getConductorTrip(),
        StaffService.getConductorTrips(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value?.data);
      if (tripRes.status === 'fulfilled') setTrip(tripRes.value?.data);
      if (tripsRes.status === 'fulfilled') setAssignedTrips(tripsRes.value?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOccupancy = useCallback(async () => {
    if (!trip?.trip_id) {
      setOccupancy(null);
      return;
    }
    try {
      const res = await StaffService.getTripOccupancy();
      setOccupancy(res?.data);
    } catch (err) { setError(err.message); }
  }, [trip?.trip_id]);

  const loadPassengers = useCallback(async () => {
    if (!trip?.trip_id) {
      setPassengers([]);
      return;
    }
    try {
      const res = await StaffService.getCurrentPassengers();
      const payload = res?.data;
      if (Array.isArray(payload)) {
        setPassengers(payload);
      } else {
        setPassengers(payload?.passengers ?? []);
      }
    } catch (err) { setError(err.message); }
  }, [trip?.trip_id]);

  const loadPin = useCallback(async () => {
    if (!trip?.trip_id) {
      setPin(null);
      return;
    }
    try {
      const res = await StaffService.getConductorPin();
      setPin(res?.data);
    } catch (err) { setError(err.message); }
  }, [trip?.trip_id]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    loadData();
  }, [loadData]);
  useEffect(() => { if (activeTab === 'occupancy' && hasActiveTrip) loadOccupancy(); }, [activeTab, hasActiveTrip, loadOccupancy]);
  useEffect(() => { if (activeTab === 'passengers' && hasActiveTrip) loadPassengers(); }, [activeTab, hasActiveTrip, loadPassengers]);
  useEffect(() => { if (activeTab === 'pin' && hasActiveTrip) loadPin(); }, [activeTab, hasActiveTrip, loadPin]);

  const handleScan = async () => {
    if (!trip?.trip_id) {
      setScanResult({ success: false, msg: 'No active trip assigned. Ticket scanning is unavailable.' });
      return;
    }
    setScanResult(null);
    try {
      const res = await StaffService.scanTicket(scanUuid);
      setScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg('✅ Ticket scanned successfully');
      loadOccupancy();
    } catch (err) {
      setScanResult({ success: false, msg: err.message });
    }
  };

  const handleAlight = async (ticketId) => {
    try {
      await StaffService.recordAlighting(ticketId);
      setActionMsg('✅ Alighting recorded');
      loadPassengers();
    } catch (err) { setActionMsg('❌ ' + err.message); }
  };

  const handleVerifyPin = async () => {
    if (!trip?.trip_id) {
      setPinStatus('❌ No active trip assigned. PIN verification is unavailable.');
      return;
    }
    try {
      await StaffService.verifyConductorPin(pinInput);
      setPinStatus('✅ PIN verified successfully!');
    } catch (err) { setPinStatus('❌ ' + err.message); }
  };

  const handleLogout = async () => {
    await StaffService.logout('conductor').catch(() => {});
    navigate('/employee/login');
  };

  const capPct = occupancy
    ? Math.min(100, Math.round(((Number(occupancy?.boarded?.seated ?? occupancy?.current_seated ?? 0) + Number(occupancy?.boarded?.standing ?? occupancy?.current_standing ?? 0)) / (Number(occupancy?.capacity?.total ?? occupancy?.total_capacity ?? 1) || 1)) * 100))
    : 0;

  const occSeated = Number(occupancy?.boarded?.seated ?? occupancy?.current_seated ?? 0);
  const occStanding = Number(occupancy?.boarded?.standing ?? occupancy?.current_standing ?? 0);
  const occSeatedCap = Number(occupancy?.capacity?.seated ?? occupancy?.seated_capacity ?? 0);
  const occStandingCap = Number(occupancy?.capacity?.standing ?? occupancy?.standing_capacity ?? 0);
  const occTotalCap = Number(occupancy?.capacity?.total ?? occupancy?.total_capacity ?? 0);

  return (
    <div className="staff-dash">
      <aside className="staff-sidebar conductor-theme">
        <div>
          <div className="staff-sidebar-brand">🎫 Conductor</div>
          {profile && (
            <div className="staff-sidebar-user">
              <div className="staff-avatar conductor-avatar">{(profile.name || 'C')[0].toUpperCase()}</div>
              <div>
                <div className="staff-user-name">{profile.name}</div>
                <div className="staff-user-role">Conductor</div>
              </div>
            </div>
          )}
          <nav className="staff-nav">
            {[
              { key: 'trip',       icon: '🚌', label: 'Current Trip' },
              { key: 'assigned',   icon: '📅', label: 'Assigned Trips' },
              { key: 'occupancy',  icon: '📊', label: 'Occupancy' },
              { key: 'scan',       icon: '📷', label: 'Scan Ticket' },
              { key: 'passengers', icon: '👥', label: 'Passengers' },
              { key: 'pin',        icon: '🔑', label: 'Daily PIN' },
            ].map(item => (
              <button key={item.key} className={`staff-nav-btn ${activeTab === item.key ? 'active' : ''}`} onClick={() => { setActiveTab(item.key); setActionMsg(''); setScanResult(null); }}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>
        </div>
        <button className="staff-logout-btn" onClick={handleLogout}>🚪 Sign Out</button>
      </aside>

      <main className="staff-main">
        <div className="staff-topbar">
          <h1 className="staff-page-title">
            {activeTab === 'trip' && '🚌 Current Trip'}
            {activeTab === 'assigned' && '📅 Assigned Trips'}
            {activeTab === 'occupancy' && '📊 Trip Occupancy'}
            {activeTab === 'scan' && '📷 Scan Ticket'}
            {activeTab === 'passengers' && '👥 Current Passengers'}
            {activeTab === 'pin' && '🔑 Daily PIN Verification'}
          </h1>
          {actionMsg && <div className="staff-action-msg">{actionMsg}</div>}
        </div>

        {loading && <div className="staff-loading">Loading…</div>}
        {error && <div className="staff-error">⚠️ {error}</div>}

        {/* Trip Tab */}
        {!loading && activeTab === 'trip' && (
          <div className="staff-content">
            {!trip ? (
              <div className="staff-empty-state"><div className="empty-icon">🚌</div><h3>No Active Trip</h3><p>No trip currently assigned.</p></div>
            ) : (
              <div className="staff-cards-grid">
                <div className="staff-card">
                  <div className="staff-card-header">
                    <h3>Trip #{trip.trip_id}</h3>
                    <span className="status-badge" style={{ background: '#3b82f622', color: '#60a5fa', borderColor: '#3b82f644' }}>{trip.status}</span>
                  </div>
                  <div className="staff-card-body">
                    <div className="info-row"><span>Date</span><strong>{trip.trip_date}</strong></div>
                    <div className="info-row"><span>Seated Passengers</span><strong>{trip.current_seated_capacity ?? 0}</strong></div>
                    <div className="info-row"><span>Standing Passengers</span><strong>{trip.current_standing_capacity ?? 0}</strong></div>
                    <div className="info-row"><span>Total Occupancy</span><strong>{trip.total_occupancy ?? 0}</strong></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assigned Trips Tab */}
        {!loading && activeTab === 'assigned' && (
          <div className="staff-content">
            {assignedTrips.length === 0 ? (
              <div className="staff-empty-state"><div className="empty-icon">📅</div><h3>No Assigned Trips</h3><p>You do not have any upcoming assigned trips.</p></div>
            ) : (
              <div className="staff-cards-grid">
                {assignedTrips.map((item) => (
                  <div key={item.trip_id} className="staff-card">
                    <div className="staff-card-header">
                      <h3>Trip #{item.trip_id}</h3>
                      <span className="status-badge" style={{ background: '#3b82f622', color: '#60a5fa', borderColor: '#3b82f644' }}>{item.status}</span>
                    </div>
                    <div className="staff-card-body">
                      <div className="info-row"><span>Date</span><strong>{item.trip_date}</strong></div>
                      <div className="info-row"><span>Fleet</span><strong>{item.fleet_route?.fleet?.plate_number || `Fleet ${item.fleet_route?.fleet_id || '-'}`}</strong></div>
                      <div className="info-row"><span>Route</span><strong>{item.fleet_route?.route?.route_name || `Route ${item.fleet_route?.route_id || '-'}`}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Occupancy Tab */}
        {activeTab === 'occupancy' && (
          <div className="staff-content">
            {!occupancy ? (
              <div className="staff-empty-state"><div className="empty-icon">📊</div><h3>No Occupancy Data</h3></div>
            ) : (
              <div className="staff-cards-grid">
                <div className="staff-card">
                  <div className="staff-card-header"><h3>Live Occupancy</h3></div>
                  <div className="capacity-bar-container">
                    <div className="capacity-bar" style={{ width: `${capPct}%`, background: capPct > 90 ? '#ef4444' : capPct > 70 ? '#f59e0b' : '#22c55e' }} />
                  </div>
                  <div className="capacity-label">{capPct}% Full</div>
                  <div className="staff-card-body" style={{ marginTop: '16px' }}>
                    <div className="info-row"><span>Seated</span><strong>{occSeated} / {occSeatedCap}</strong></div>
                    <div className="info-row"><span>Standing</span><strong>{occStanding} / {occStandingCap}</strong></div>
                    <div className="info-row"><span>Total Capacity</span><strong>{occTotalCap}</strong></div>
                  </div>
                  <div className="staff-card-actions">
                    <button className="action-btn action-btn-ghost" onClick={loadOccupancy}>🔄 Refresh</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="staff-content">
            <div className="staff-cards-grid" style={{ maxWidth: '600px' }}>
              <div className="staff-card">
                <div className="staff-card-header"><h3>Scan QR Ticket</h3></div>
                <div className="staff-card-body">
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '16px' }}>Enter the ticket UUID to validate a passenger's ticket.</p>
                  <div className="pin-input-row">
                    <input
                      type="text"
                      placeholder="ticket-uuid-here"
                      value={scanUuid}
                      onChange={e => { setScanUuid(e.target.value); setScanResult(null); }}
                      className="pin-input"
                      style={{ fontFamily: 'monospace' }}
                    />
                    <button className="action-btn action-btn-primary" onClick={handleScan}>Scan</button>
                  </div>
                  {scanResult && (
                    <div className={`scan-result ${scanResult.success ? 'success' : 'fail'}`}>
                      <div className="scan-result-icon">{scanResult.success ? '✅' : '❌'}</div>
                      <div>
                        <strong>{scanResult.msg}</strong>
                        {scanResult.success && scanResult.data && (
                          <div className="scan-detail">
                            <div>Destination: {scanResult.data.destination || 'N/A'}</div>
                            <div>Seat type: {scanResult.data.seat_type}</div>
                            <div>Amount: ₱{scanResult.data.amount}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Passengers Tab */}
        {activeTab === 'passengers' && (
          <div className="staff-content">
            {passengers.length === 0 ? (
              <div className="staff-empty-state"><div className="empty-icon">👥</div><h3>No Passengers</h3><p>No passengers currently on this trip.</p></div>
            ) : (
              <div className="passengers-table-wrap">
                <table className="passengers-table">
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Seat Type</th><th>Destination</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {passengers.map((p, i) => (
                      <tr key={p.ticket_id ?? i}>
                        <td>{i + 1}</td>
                        <td>{p.passenger_name ?? p.passenger?.name ?? 'Guest'}</td>
                        <td><span className="seat-badge">{p.seat_type}</span></td>
                        <td>{p.destination_stop ?? p.destination_stop?.stop_name ?? '—'}</td>
                        <td><span className={`ticket-status ${p.status ?? 'boarded'}`}>{p.status ?? 'boarded'}</span></td>
                        <td>
                          {!p.alighted_at && (
                            <button className="action-btn action-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleAlight(p.ticket_id)}>
                              Record Alight
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PIN Tab */}
        {activeTab === 'pin' && (
          <div className="staff-content">
            <div className="staff-cards-grid" style={{ maxWidth: '600px' }}>
              {pin && (
                <div className="staff-card pin-card">
                  <div className="staff-card-header"><h3>Today's PIN Code</h3></div>
                  <div className="pin-display">{pin.pin_code}</div>
                  <div className="staff-card-body">
                    <div className="info-row"><span>Trip</span><strong>#{pin.trip_id ?? '-'}</strong></div>
                    {pin.route_name && <div className="info-row"><span>Route</span><strong>{pin.route_name}</strong></div>}
                    {pin.fleet_plate_number && <div className="info-row"><span>Fleet</span><strong>{pin.fleet_plate_number}</strong></div>}
                    {pin.trip_status && <div className="info-row"><span>Status</span><strong>{pin.trip_status}</strong></div>}
                    <div className="info-row"><span>Date</span><strong>{pin.pin_date}</strong></div>
                    <div className="info-row"><span>Verified</span><strong>{pin.conductor_verified_at ? '✅ Yes' : '❌ Not yet'}</strong></div>
                  </div>
                </div>
              )}
              <div className="staff-card">
                <div className="staff-card-header"><h3>Verify PIN</h3></div>
                <div className="staff-card-body">
                  <div className="pin-input-row">
                    <input type="text" maxLength={6} placeholder="000000" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinStatus(''); }} className="pin-input" />
                    <button className="action-btn action-btn-primary" onClick={handleVerifyPin}>Verify</button>
                  </div>
                  {pinStatus && <div style={{ marginTop: '12px', fontSize: '0.9rem', color: pinStatus.startsWith('✅') ? '#22c55e' : '#f87171' }}>{pinStatus}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
