import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffService from '../../api/StaffService/StaffService';
import './DriverPortal.css';

const STATUS_COLOR = {
  scheduled: '#64748b',
  boarding: '#3b82f6',
  departed: '#f59e0b',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [pin, setPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const hasActiveTrip = !!trip?.trip_id;
  const didBootstrap = useRef(false);

  const currentRoute = trip?.fleet_route?.route;
  const currentFleet = trip?.fleet_route?.fleet;
  const nextStop = stops.find((stop) => !stop.is_acknowledged) ?? null;

  const currentPassengers = Number(trip?.total_occupancy ?? 0);
  const currentCapacity = Number(currentFleet?.capacity ?? 0);
  const tripProgress = currentCapacity > 0
    ? Math.min(100, Math.round((currentPassengers / currentCapacity) * 100))
    : (trip?.status === 'completed' ? 100 : 35);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, tripRes, tripsRes] = await Promise.allSettled([
        StaffService.getProfile('driver'),
        StaffService.getCurrentTrip(),
        StaffService.getDriverTrips(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value?.data);
      if (tripRes.status === 'fulfilled') setTrip(tripRes.value?.data);
      if (tripsRes.status === 'fulfilled') setAssignedTrips(tripsRes.value?.data ?? []);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStops = useCallback(async () => {
    if (!hasActiveTrip) {
      setStops([]);
      return;
    }
    try {
      const res = await StaffService.getCurrentTripStops();
      const payload = res?.data ?? null;
      if (Array.isArray(payload)) {
        setStops(payload);
      } else {
        setStops(payload?.stops ?? []);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [hasActiveTrip]);

  const loadPin = useCallback(async () => {
    if (!hasActiveTrip) {
      setPin(null);
      return;
    }
    try {
      const res = await StaffService.getDriverPin();
      setPin(res?.data);
    } catch (err) {
      setError(err.message);
    }
  }, [hasActiveTrip]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (['journey', 'navigation', 'trip', 'dashboard'].includes(activeTab) && hasActiveTrip) {
      void loadStops();
    }
  }, [activeTab, hasActiveTrip, loadStops]);

  useEffect(() => {
    if (['trip', 'account'].includes(activeTab) && hasActiveTrip) {
      void loadPin();
    }
  }, [activeTab, hasActiveTrip, loadPin]);

  const handleVerifyPin = async () => {
    if (!trip?.trip_id) {
      setPinStatus('No active trip assigned. PIN verification is unavailable.');
      return;
    }
    try {
      await StaffService.verifyDriverPin(pinInput);
      setPinStatus('PIN verified successfully.');
    } catch (err) {
      setPinStatus(err.message);
    }
  };

  const handleAcknowledgeStop = async (stopId) => {
    try {
      await StaffService.acknowledgeStop(stopId);
      setActionMsg('Stop acknowledged.');
      void loadStops();
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const handleTripAction = async (action) => {
    if (!trip) return;
    try {
      if (action === 'depart') await StaffService.departTrip(trip.trip_id);
      if (action === 'complete') await StaffService.completeTrip(trip.trip_id);
      setActionMsg(`Trip ${action} action completed.`);
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const handleLogout = async () => {
    await StaffService.logout('driver').catch(() => {});
    navigate('/employee/login');
  };

  const notifications = [
    {
      title: trip?.status === 'boarding' ? 'Trip Ready for Departure' : 'Trip Status Updated',
      note: currentRoute ? `${currentRoute.origin} to ${currentRoute.destination}` : 'Your assigned route is active.',
      tone: 'danger',
      time: 'Now',
    },
    {
      title: nextStop ? `Next stop: ${nextStop.stop_name ?? nextStop.name ?? 'Pending stop'}` : 'Route on schedule',
      note: nextStop ? 'Proceed when safe and acknowledge upon arrival.' : 'All available stops are acknowledged.',
      tone: 'warn',
      time: 'Updated',
    },
    {
      title: 'Route update available',
      note: 'Keep navigation and alerts in sync before departure.',
      tone: 'info',
      time: 'Today',
    },
  ];

  const journeyStatusLabel =
    trip?.status === 'completed'
      ? 'Journey Completed'
      : trip?.status === 'departed' || trip?.status === 'in-progress'
        ? 'Journey In Progress'
        : 'Ready to Start';

  return (
    <div className="driver-portal">
      <aside className="driver-sidebar">
        <div>
          <div className="driver-brand">
            <div className="driver-brand-icon">ST</div>
            <div>
              <p className="driver-brand-title">SMARTTRANSIT</p>
              <p className="driver-brand-sub">Driver Portal</p>
            </div>
          </div>

          <nav className="driver-nav">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'assigned', label: 'Assigned Routes' },
              { key: 'journey', label: 'Journey' },
              { key: 'navigation', label: 'Navigation' },
              { key: 'alerts', label: 'Traffic Alerts' },
              { key: 'trip', label: 'Trip Status' },
              { key: 'account', label: 'Account' },
            ].map((item) => (
              <button
                key={item.key}
                className={`driver-nav-btn ${activeTab === item.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.key);
                  setActionMsg('');
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="driver-sidebar-footer">
          <div className="driver-mini-profile">
            <div className="driver-avatar">{(profile?.name || 'D')[0].toUpperCase()}</div>
            <div>
              <p className="driver-mini-name">{profile?.name || 'Driver'}</p>
              <p className="driver-mini-role">Driver</p>
            </div>
          </div>
          <button className="driver-signout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="driver-main">
        <header className="driver-topbar">
          <div>
            <h1>
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'assigned' ? 'Assigned Routes' : activeTab === 'journey' ? 'Journey' : activeTab === 'navigation' ? 'Journey / Route Navigation' : activeTab === 'alerts' ? 'Traffic Alerts' : activeTab === 'trip' ? 'Trip Status' : 'Account'}
            </h1>
            <p>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="driver-refresh" onClick={loadData}>Refresh</button>
        </header>

        {loading && <div className="driver-loading">Loading driver workspace...</div>}
        {error && <div className="driver-error">{error}</div>}
        {actionMsg && <div className="driver-success">{actionMsg}</div>}

        {!loading && activeTab === 'dashboard' && (
          <section className="driver-grid">
            <article className="driver-card">
              <p className="driver-card-kicker">Today's Trip</p>
              <h3>{currentRoute?.route_name || `Route ${trip?.fleet_route_id ?? '-'}`}</h3>
              <p>{currentRoute?.origin || '-'} to {currentRoute?.destination || '-'}</p>
              <button className="driver-link-btn" onClick={() => setActiveTab('assigned')}>View details</button>
            </article>

            <article className="driver-card">
              <p className="driver-card-kicker">Next Stop</p>
              <h3>{nextStop?.stop_name ?? nextStop?.name ?? 'No pending stop'}</h3>
              <p>ETA {trip?.trip_date || 'Today'}</p>
            </article>

            <article className="driver-card">
              <p className="driver-card-kicker">Trip Progress</p>
              <h3>{tripProgress}%</h3>
              <div className="driver-progress-track">
                <div className="driver-progress-fill" style={{ width: `${tripProgress}%` }} />
              </div>
              <p>{journeyStatusLabel}</p>
            </article>

            <article className="driver-card">
              <p className="driver-card-kicker">Journey Status</p>
              <h3>{trip?.status || 'No active trip'}</h3>
              <p>{trip?.status === 'completed' ? 'Journey completed successfully' : 'Use quick actions to control trip flow'}</p>
            </article>

            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Quick Actions</h4>
              </div>
              <div className="driver-action-stack">
                <button className="driver-action primary" onClick={() => handleTripAction('depart')} disabled={trip?.status !== 'boarding'}>
                  Start Trip
                </button>
                <button className="driver-action secondary" onClick={loadData}>
                  Receive Route Updates
                </button>
                <button className="driver-action danger" onClick={() => handleTripAction('complete')} disabled={!['departed', 'in-progress'].includes(trip?.status)}>
                  End Trip
                </button>
              </div>
            </article>

            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Quick Notifications</h4>
              </div>
              <div className="driver-notice-list">
                {notifications.map((notice, idx) => (
                  <div key={idx} className={`driver-notice ${notice.tone}`}>
                    <div>
                      <p>{notice.title}</p>
                      <span>{notice.note}</span>
                    </div>
                    <small>{notice.time}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'assigned' && (
          <section className="driver-panel">
            <div className="driver-panel-head">
              <h4>Today's Assigned Routes</h4>
              <span>{assignedTrips.length} trip(s)</span>
            </div>
            {assignedTrips.length === 0 ? (
              <div className="driver-empty">No assigned trips for today.</div>
            ) : (
              <table className="driver-table">
                <thead>
                  <tr>
                    <th>Route ID</th>
                    <th>Route</th>
                    <th>Departure</th>
                    <th>Destination</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedTrips.map((item) => (
                    <tr key={item.trip_id}>
                      <td>RTE-{item.trip_id}</td>
                      <td>{item.fleet_route?.route?.origin || '-'} to {item.fleet_route?.route?.destination || '-'}</td>
                      <td>{item.trip_date || '-'}</td>
                      <td>{item.fleet_route?.route?.destination || '-'}</td>
                      <td>
                        <span className="driver-status-pill" style={{ color: STATUS_COLOR[item.status] || '#64748b' }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {!loading && activeTab === 'journey' && (
          <section className="driver-grid two-col">
            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Journey Stops</h4>
              </div>
              {stops.length === 0 ? (
                <div className="driver-empty">No stop data available.</div>
              ) : (
                <div className="driver-stop-list">
                  {stops.map((stop, idx) => (
                    <div key={stop.stop_id ?? idx} className={`driver-stop-item ${stop.is_acknowledged ? 'done' : ''}`}>
                      <div>
                        <p>{stop.stop_name ?? stop.name ?? `Stop ${idx + 1}`}</p>
                        <span>{stop.distance_from_origin_km != null ? `${stop.distance_from_origin_km} km from origin` : 'Distance unavailable'}</span>
                      </div>
                      {stop.is_acknowledged ? (
                        <span className="driver-ack">Reached</span>
                      ) : (
                        <button onClick={() => handleAcknowledgeStop(stop.route_stop_id ?? stop.stop_id)}>Acknowledge</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Live Summary</h4>
              </div>
              <div className="driver-metric-stack">
                <div><span>Total Distance</span><strong>{stops[stops.length - 1]?.distance_from_origin_km ?? 0} km</strong></div>
                <div><span>Travel Time</span><strong>{trip?.trip_date ? '1h 10m' : '-'}</strong></div>
                <div><span>Average Speed</span><strong>38 km/h</strong></div>
                <div><span>Total Stops</span><strong>{stops.length}</strong></div>
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'navigation' && (
          <section className="driver-grid two-col">
            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Route Navigation</h4>
              </div>
              <div className="driver-map-placeholder">
                <div className="route-line" />
                <div className="route-pin start" />
                <div className="route-pin end" />
                <span className="map-label start">{currentRoute?.origin || 'Origin'}</span>
                <span className="map-label end">{currentRoute?.destination || 'Destination'}</span>
              </div>
            </article>

            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Route Details</h4>
              </div>
              <div className="driver-step-list">
                {stops.length === 0 ? (
                  <div className="driver-empty">No route details available.</div>
                ) : (
                  stops.map((stop, idx) => (
                    <div key={stop.stop_id ?? idx} className="driver-step-item">
                      <span>{idx + 1}</span>
                      <div>
                        <p>{stop.stop_name ?? stop.name ?? `Stop ${idx + 1}`}</p>
                        <small>{stop.distance_from_origin_km != null ? `${stop.distance_from_origin_km} km` : ''}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'alerts' && (
          <section className="driver-panel">
            <div className="driver-panel-head">
              <h4>Traffic Alerts</h4>
              <button className="driver-inline-btn">Mark all as read</button>
            </div>
            <div className="driver-notice-list">
              {notifications.map((notice, idx) => (
                <div key={idx} className={`driver-notice ${notice.tone}`}>
                  <div>
                    <p>{notice.title}</p>
                    <span>{notice.note}</span>
                  </div>
                  <small>{notice.time}</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && activeTab === 'trip' && (
          <section className="driver-grid two-col">
            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Current Trip Summary</h4>
                <span className="driver-status-pill" style={{ color: STATUS_COLOR[trip?.status] || '#64748b' }}>{trip?.status || 'idle'}</span>
              </div>
              <div className="driver-metric-stack">
                <div><span>Total Distance</span><strong>{stops[stops.length - 1]?.distance_from_origin_km ?? 0} km</strong></div>
                <div><span>Travel Time</span><strong>1h 10m</strong></div>
                <div><span>Average Speed</span><strong>38 km/h</strong></div>
                <div><span>Trip Progress</span><strong>{tripProgress}%</strong></div>
              </div>
              <div className="driver-progress-track">
                <div className="driver-progress-fill" style={{ width: `${tripProgress}%` }} />
              </div>
              <div className="driver-action-row">
                <button className="driver-action primary" onClick={() => handleTripAction('depart')} disabled={trip?.status !== 'boarding'}>Start Trip</button>
                <button className="driver-action danger" onClick={() => handleTripAction('complete')} disabled={!['departed', 'in-progress'].includes(trip?.status)}>End Trip</button>
              </div>
            </article>

            <article className="driver-panel">
              <div className="driver-panel-head">
                <h4>Verify Daily PIN</h4>
              </div>
              {pin && <p className="driver-pin-code">PIN: {pin.pin_code}</p>}
              <div className="driver-pin-row">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinStatus(''); }}
                />
                <button onClick={handleVerifyPin}>Verify</button>
              </div>
              {pinStatus && <p className={`driver-pin-msg ${pinStatus === 'PIN verified successfully.' ? 'ok' : 'bad'}`}>{pinStatus}</p>}
            </article>
          </section>
        )}

        {!loading && activeTab === 'account' && (
          <section className="driver-grid two-col">
            <article className="driver-panel">
              <div className="driver-panel-head"><h4>Profile Information</h4></div>
              <div className="driver-profile-card">
                <div className="driver-avatar large">{(profile?.name || 'D')[0].toUpperCase()}</div>
                <h3>{profile?.name || 'Driver'}</h3>
                <p>Verified Driver</p>
              </div>
              <div className="driver-metric-stack">
                <div><span>Email</span><strong>{profile?.user?.email || profile?.email || '-'}</strong></div>
                <div><span>Driver ID</span><strong>{profile?.company_user_id || '-'}</strong></div>
                <div><span>Status</span><strong>Active</strong></div>
              </div>
            </article>

            <article className="driver-panel">
              <div className="driver-panel-head"><h4>PIN and Trip Context</h4></div>
              <div className="driver-metric-stack">
                <div><span>Trip ID</span><strong>{pin?.trip_id ?? trip?.trip_id ?? '-'}</strong></div>
                <div><span>Route</span><strong>{pin?.route_name || currentRoute?.route_name || '-'}</strong></div>
                <div><span>Fleet</span><strong>{pin?.fleet_plate_number || currentFleet?.plate_number || '-'}</strong></div>
                <div><span>Date</span><strong>{pin?.pin_date || trip?.trip_date || '-'}</strong></div>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
