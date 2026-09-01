import React, { useState } from 'react';

export default function StartShiftPage({ onNavigate }) {
  const [bus, setBus] = useState('Bus #1 (Aircon / 50-Seater)');
  const [driver, setDriver] = useState("Roberto 'Berto' Garcia (DRV-2)");

  const handleStartShift = (e) => {
    e.preventDefault();

    // 1. Save assignment details to LocalStorage
    localStorage.setItem('assigned_bus', bus.includes('#1') ? 'Bus 001' : 'Bus 002');
    localStorage.setItem('assigned_bus_seats', '50');
    localStorage.setItem('assigned_route', 'Davao City - Tagum City');

    alert("Shift Started Successfully!");

    // 2. TAWAGIN ITO PARA DUMIRETSO SA TICKETING PAGE:
    if (onNavigate) {
      onNavigate('ticketing');
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <nav className="sidebar-menu">
          <a href="#" className="menu-item active-nav" onClick={() => onNavigate && onNavigate('start-shift')}>
            <span>Start Shift</span>
          </a>
          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('ticketing')}>
            <span>Ticketing</span>
          </a>
          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('scan-ticket')}>
            <span>Scan Ticket</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <h2>Welcome back, Chauffeur John!</h2>
        <p>Please confirm your fleet assignment and pairing details before starting your shift.</p>

        <form onSubmit={handleStartShift}>
          <div className="form-group">
            <label>Assigned Vehicle / Fleet Number</label>
            <select value={bus} onChange={(e) => setBus(e.target.value)}>
              <option value="Bus #1 (Aircon / 50-Seater)">Bus #1 (Aircon / 50-Seater)</option>
              <option value="Bus #2 (Economy / 60-Seater)">Bus #2 (Economy / 60-Seater)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Assigned Partner / Driver</label>
            <select value={driver} onChange={(e) => setDriver(e.target.value)}>
              <option value="Roberto 'Berto' Garcia (DRV-2)">Roberto 'Berto' Garcia (DRV-2)</option>
            </select>
          </div>

          <button type="submit" className="btn-confirm">
            CONFIRM & START SHIFT
          </button>
        </form>
      </main>
    </div>
  );
}