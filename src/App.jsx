import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import './App.css';

export default function App() {
  // ================= STATE MANAGEMENT =================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chauffeurIdInput, setChauffeurIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Shift & Navigation Lock State
  const [isShiftStarted, setIsShiftStarted] = useState(false); // Controls navigation lock
  const [activeTab, setActiveTab] = useState('start-shift');
  const [isShiftOpen, setIsShiftOpen] = useState(true);

  // Ticketing States
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [destination, setDestination] = useState('Tagum City');
  const [passengerType, setPassengerType] = useState('Regular');
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Scan Ticket States
  const [scannedTickets, setScannedTickets] = useState([]);

  // End Shift Protection State
  const [isReportDownloaded, setIsReportDownloaded] = useState(false);

  // ================= FARE MATRIX =================
  const fareMatrix = {
    'Panabo City': 50.00,
    'Carmen': 65.00,
    'Tagum City': 80.00
  };

  const getComputedFare = () => {
    const basePrice = fareMatrix[destination] || 80.00;
    if (['Student', 'Senior Citizen', 'PWD'].includes(passengerType)) {
      return basePrice * 0.80;
    }
    return basePrice;
  };

  // ================= LOGIN SUBMIT =================
  const handleLogin = (e) => {
    e.preventDefault();
    if (chauffeurIdInput === 'CFR-2026-001' && passwordInput === '123') {
      setIsLoggedIn(true);
      setActiveTab('start-shift');
      setIsShiftOpen(true);
      setIsShiftStarted(false); // Locked system upon login
    } else {
      alert('Chauffeur ID or Password Incorrect!\n\nTest Account:\nID: CFR-2026-001\nPassword: 123');
    }
  };

  // ================= START SHIFT CONFIRM (UNLOCKS NAVIGATION) =================
  const handleStartShiftConfirm = (e) => {
    e.preventDefault();
    setIsShiftStarted(true); // Unlock navigation links
    setActiveTab('ticketing');
    setIsShiftOpen(false); // Close shift sub-menu
  };

  // ================= SEAT SELECTION & TICKET GENERATION =================
  const handleSeatClick = (seatNum) => {
    if (occupiedSeats.includes(seatNum)) return;
    setSelectedSeat(selectedSeat === seatNum ? null : seatNum);
  };

  const handleGenerateTicket = (e) => {
    e.preventDefault();
    if (!selectedSeat) {
      alert('Please choose a seat from the Seat Layout first!');
      return;
    }

    const fare = getComputedFare();
    const newTx = {
      ticketId: 'TCK-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      destination,
      passengerType,
      fare,
      seatNumber: selectedSeat,
      paymentMethod: 'Cash'
    };

    setTransactions([...transactions, newTx]);
    setOccupiedSeats([...occupiedSeats, selectedSeat]);
    setSelectedSeat(null);
    alert(`Ticket Generated!\nID: ${newTx.ticketId}\nSeat: ${newTx.seatNumber}\nFare: ₱${fare.toFixed(2)}`);
  };

  const handleMarkFullyOccupied = () => {
    const allSeats = Array.from({ length: 50 }, (_, i) => String(i + 1));
    setOccupiedSeats(allSeats);
    setSelectedSeat(null);
  };

  // ================= SIMULATED SCANNER =================
  const handleSimulateScan = () => {
    const scanId = 'QR-TCK-' + Math.floor(1000 + Math.random() * 9000);
    const isDuplicate = scannedTickets.some(t => t.id === scanId);

    if (isDuplicate) {
      alert(`Error: Ticket [${scanId}] has already been scanned! Duplicate scans are blocked.`);
      return;
    }

    const newScan = {
      id: scanId,
      destination: 'Tagum City',
      dateTime: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      fare: 80.00
    };

    setScannedTickets([...scannedTickets, newScan]);
    alert(`Ticket Validated Successfully!\n\nID: ${newScan.id}\nDestination: ${newScan.destination}`);
  };

  // ================= CALCULATE METRICS =================
  const cashCollected = transactions.reduce((acc, curr) => acc + (curr.fare || 0), 0);
  const digitalPayments = scannedTickets.reduce((acc, curr) => acc + (curr.fare || 0), 0);
  const totalRevenue = cashCollected + digitalPayments;
  const totalPassengers = transactions.length + scannedTickets.length;

  // ================= DOWNLOAD PDF REPORT =================
  const handleDownloadPDF = () => {
    const reportContainer = document.createElement('div');
    reportContainer.style.padding = '30px';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    reportContainer.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #178a9c; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px; color: #2b434f;">CHAUFFEUR SHIFT REVENUE REPORT</h1>
        <p style="margin: 5px 0 0; font-size: 11px; color: #666;">Generated on: <strong>${new Date().toLocaleString()}</strong></p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; background: #f8f9fa; padding: 12px; border-radius: 6px;">
        <div>
          <p style="margin: 0 0 4px;"><strong>Chauffeur ID:</strong> CFR-2026-001</p>
          <p style="margin: 0 0 4px;"><strong>Assigned Vehicle:</strong> Bus #1 (Aircon / 50-Seater)</p>
          <p style="margin: 0;"><strong>Partner Driver:</strong> Roberto 'Berto' Garcia (DRV-2026-101)</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 4px;"><strong>Status:</strong> Shift Closed / Audited</p>
          <p style="margin: 0;"><strong>Shift Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <h3 style="font-size: 14px; border-left: 4px solid #178a9c; padding-left: 8px; margin-bottom: 10px;">FINANCIAL SUMMARY</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
        <tr style="background: #2b434f; color: #fff;">
          <th style="padding: 8px; text-align: left;">Total Revenue</th>
          <th style="padding: 8px; text-align: left;">Cash Collected</th>
          <th style="padding: 8px; text-align: left;">Digital Payments</th>
          <th style="padding: 8px; text-align: left;">Total Passengers</th>
        </tr>
        <tr style="background: #f2f2f2;">
          <td style="padding: 10px; font-weight: bold; color: #178a9c;">₱${totalRevenue.toFixed(2)}</td>
          <td style="padding: 10px;">₱${cashCollected.toFixed(2)}</td>
          <td style="padding: 10px;">₱${digitalPayments.toFixed(2)}</td>
          <td style="padding: 10px;">${totalPassengers}</td>
        </tr>
      </table>

      <h3 style="font-size: 14px; border-left: 4px solid #178a9c; padding-left: 8px; margin-bottom: 10px;">TRIP BREAKDOWN LOGS</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 40px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Trip ID</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Route</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Start Time</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">End Time</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Earnings</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>TRP-001</td>
            <td>Davao City - Tagum City</td>
            <td>--:--</td>
            <td>--:--</td>
            <td>₱${totalRevenue.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `;

    const opt = {
      margin: 10,
      filename: `Shift_Report_CFR-2026-001.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportContainer).save();
    setIsReportDownloaded(true);
  };

  // ================= VERIFY & END SHIFT (LOGOUT) =================
  const handleVerifyEndShift = () => {
    if (!isReportDownloaded) {
      alert('Action Required: Please download the Revenue Report first before ending your shift.');
      return;
    }

    const confirmLogout = window.confirm('Are you sure you want to end your shift and log out?');
    if (confirmLogout) {
      setTransactions([]);
      setOccupiedSeats([]);
      setScannedTickets([]);
      setSelectedSeat(null);
      setIsReportDownloaded(false);
      setIsShiftStarted(false);
      setIsLoggedIn(false);
      alert('Shift ended successfully. Redirecting to Login Page...');
    }
  };

  // ================= 1. LOGIN SCREEN =================
  if (!isLoggedIn) {
    return (
      <div className="dashboard-body">
        <div className="dashboard-container">
          <aside className="sidebar" style={{ width: '280px', padding: '40px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div>
              <h1 style={{ color: '#fff', fontSize: '22px', margin: '0 0 8px 0', fontWeight: 'bold' }}>Bus Operator</h1>
              <h2 style={{ color: '#90a4ae', fontSize: '10px', letterSpacing: '1px', lineHeight: '1.4', margin: 0 }}>
                FLEET MANAGEMENT:<br />CHAUFFEUR PORTAL
              </h2>
            </div>
            
            <div style={{ color: '#37474f', fontSize: '100px', textAlign: 'center', marginBottom: '20px' }}>
              <i className="fa-solid fa-bus"></i>
            </div>
          </aside>

          <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0', padding: '40px' }}>
            <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', color: '#111', margin: '0 0 8px 0', fontWeight: 'bold' }}>Sign In</h2>
              <p style={{ fontSize: '12px', color: '#555', margin: '0 0 24px 0', lineHeight: '1.4' }}>
                Please enter the credentials provided by your Bus Operator administrator.
              </p>

              <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '6px' }}>
                    Chauffeur ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CFR-2026-001"
                    value={chauffeurIdInput}
                    onChange={(e) => setChauffeurIdInput(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="Password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>

                <button 
                  type="submit" 
                  style={{ width: '100%', padding: '12px', backgroundColor: '#178a9c', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                >
                  SIGN IN
                </button>
              </form>

              <div style={{ marginTop: '20px', fontSize: '11px', color: '#666' }}>
                <p style={{ margin: '0 0 4px 0' }}>Forgot your operator-issued credentials?</p>
                <a href="#contact" style={{ color: '#178a9c', textDecoration: 'underline' }}>Contact Dispatcher</a>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ================= 2. DASHBOARD SHELL =================
  return (
    <div className="dashboard-body">
      <div className="dashboard-container">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <i className="fa-solid fa-bus"></i>
          </div>

          <nav className="sidebar-menu">
            <div className="menu-group">
              <div 
                className={`menu-item ${activeTab === 'start-shift' || activeTab === 'end-shift' ? 'active-nav' : ''}`}
                onClick={() => {
                  if (isShiftStarted) {
                    setIsShiftOpen(!isShiftOpen);
                  }
                }}
                style={{
                  cursor: isShiftStarted ? 'pointer' : 'not-allowed',
                  color: (activeTab === 'start-shift' || activeTab === 'end-shift') ? '#00e676' : '#b0bec5',
                  fontWeight: (activeTab === 'start-shift' || activeTab === 'end-shift') ? 'bold' : 'normal'
                }}
              >
                <i className="fa-solid fa-clock-rotate-left"></i>
                <span>Shift</span>
              </div>

              {isShiftOpen && (
                <div className="sub-menu" style={{ padding: '2px 0 6px 0', margin: 0 }}>
                  <div 
                    className={`sub-item ${activeTab === 'start-shift' ? 'active-sub' : ''}`}
                    onClick={() => setActiveTab('start-shift')}
                    style={{ 
                      color: activeTab === 'start-shift' ? '#00e676' : '#b0bec5', 
                      fontWeight: activeTab === 'start-shift' ? 'bold' : 'normal', 
                      paddingLeft: '32px', 
                      paddingTop: '3px',
                      paddingBottom: '3px',
                      margin: '2px 0', 
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <i className="fa-solid fa-circle-dot" style={{ fontSize: '8px', marginRight: '8px' }}></i> Start Shift
                  </div>

                  {/* END SHIFT IS DISABLED/LOCKED UNTIL SHIFT IS STARTED */}
                  <div 
                    className={`sub-item ${activeTab === 'end-shift' ? 'active-sub' : ''}`}
                    onClick={() => {
                      if (isShiftStarted) {
                        setActiveTab('end-shift');
                      }
                    }}
                    style={{ 
                      color: isShiftStarted ? (activeTab === 'end-shift' ? '#00e676' : '#b0bec5') : '#546e7a', 
                      fontWeight: activeTab === 'end-shift' ? 'bold' : 'normal', 
                      paddingLeft: '32px', 
                      paddingTop: '3px',
                      paddingBottom: '3px',
                      margin: '2px 0', 
                      cursor: isShiftStarted ? 'pointer' : 'not-allowed',
                      opacity: isShiftStarted ? 1 : 0.4,
                      fontSize: '13px'
                    }}
                  >
                    <i className="fa-solid fa-circle" style={{ fontSize: '8px', marginRight: '8px' }}></i> End Shift
                  </div>
                </div>
              )}
            </div>

            {/* TICKETING LINK IS DISABLED/LOCKED UNTIL SHIFT IS STARTED */}
            <div 
              className={`menu-item ${activeTab === 'ticketing' ? 'active-nav' : ''}`}
              onClick={() => {
                if (isShiftStarted) {
                  setActiveTab('ticketing');
                  setIsShiftOpen(false);
                }
              }}
              style={{
                cursor: isShiftStarted ? 'pointer' : 'not-allowed',
                opacity: isShiftStarted ? 1 : 0.4,
                color: activeTab === 'ticketing' ? '#00e676' : '#b0bec5',
                fontWeight: activeTab === 'ticketing' ? 'bold' : 'normal',
                borderLeft: activeTab === 'ticketing' ? '4px solid #00e676' : '4px solid transparent',
                paddingLeft: '16px',
                marginTop: '4px'
              }}
            >
              <i className="fa-solid fa-ticket" style={{ marginRight: '10px' }}></i>
              <span>Ticketing</span>
            </div>

            {/* SCAN TICKET LINK IS DISABLED/LOCKED UNTIL SHIFT IS STARTED */}
            <div 
              className={`menu-item ${activeTab === 'scan-ticket' ? 'active-nav' : ''}`}
              onClick={() => {
                if (isShiftStarted) {
                  setActiveTab('scan-ticket');
                  setIsShiftOpen(false);
                }
              }}
              style={{
                cursor: isShiftStarted ? 'pointer' : 'not-allowed',
                opacity: isShiftStarted ? 1 : 0.4,
                color: activeTab === 'scan-ticket' ? '#00e676' : '#b0bec5',
                fontWeight: activeTab === 'scan-ticket' ? 'bold' : 'normal',
                borderLeft: activeTab === 'scan-ticket' ? '4px solid #00e676' : '4px solid transparent',
                paddingLeft: '16px',
                marginTop: '4px'
              }}
            >
              <i className="fa-solid fa-qrcode" style={{ marginRight: '10px' }}></i>
              <span>Scan Ticket</span>
            </div>
          </nav>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="main-content">
          
          {/* A. START SHIFT VIEW */}
          {activeTab === 'start-shift' && (
            <>
              <header className="top-header">
                <h3>Chauffeur Portal <span className="header-date">September 1, 2026</span></h3>
                <div className="chauffeur-id-badge">Chauffeur ID: CFR-2026-001</div>
              </header>

              <div className="modal-wrapper">
                <div className="confirmation-card">
                  <h2>Welcome back, Chauffeur John!</h2>
                  <p className="modal-subtitle">Please confirm your fleet assignment and pairing details before starting your shift.</p>

                  <form onSubmit={handleStartShiftConfirm}>
                    <div className="form-group">
                      <label>Assigned Vehicle / Fleet Number</label>
                      <div className="input-verified">
                        <input type="text" value="Bus #1 (Aircon / 50-Seater)" readOnly />
                        <i className="fa-solid fa-circle-check check-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Assigned Partner / Driver</label>
                      <div className="input-verified">
                        <input type="text" value="Roberto 'Berto' Garcia (DRV-2026-101)" readOnly />
                        <i className="fa-solid fa-circle-check check-icon"></i>
                      </div>
                    </div>

                    <button type="submit" className="btn-confirm">CONFIRM & START SHIFT</button>
                  </form>
                </div>
              </div>
            </>
          )}

          {/* B. TICKETING VIEW */}
          {activeTab === 'ticketing' && (
            <>
              <header className="top-header ticketing-header">
                <div className="route-info">
                  <h3>Bus 001 - Davao City - Tagum City</h3>
                </div>
                <div className="load-tracker">
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(occupiedSeats.length / 50) * 100}%` }}
                    ></div>
                  </div>
                  <span className="load-text">
                    Passenger Load : <strong>{occupiedSeats.length}</strong> / 50 Seats
                  </span>
                </div>
              </header>

              <div className="ticketing-workspace">
                <div className="bus-layout-card">
                  <div className="seat-layout-card">
                    <div className="seat-card-header">
                      <h4>Seat Layout</h4>
                    </div>

                    <div className="bus-seat-scroll-container">
                      <div className="driver-row">
                        <div className="driver-seat-box">
                          <i className="fa-solid fa-dharmachakra"></i>
                          <span>Driver</span>
                        </div>
                      </div>

                      <div className="seats-grid">
                        {Array.from({ length: 50 }, (_, i) => {
                          const seatNum = String(i + 1);
                          const isOccupied = occupiedSeats.includes(seatNum);
                          const isSelected = selectedSeat === seatNum;

                          return (
                            <button
                              key={seatNum}
                              type="button"
                              className={`seat ${isOccupied ? 'occupied' : isSelected ? 'selected' : 'available'}`}
                              disabled={isOccupied}
                              onClick={() => handleSeatClick(seatNum)}
                            >
                              <i className="fa-solid fa-couch"></i>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="seat-card-footer">
                      <div className="seat-legend-row">
                        <div className="legend-item">
                          <span className="legend-dot occupied"></span>
                          <span>Occupied</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-dot available"></span>
                          <span>Available</span>
                        </div>
                      </div>

                      <button type="button" className="btn-mark-occupied" onClick={handleMarkFullyOccupied}>
                        Mark Fully Occupied
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ticket-panel">
                  <div className="ticket-card">
                    <h4>Manual Cash Ticket</h4>
                    <form onSubmit={handleGenerateTicket}>
                      <div className="form-group">
                        <label>Select Destination</label>
                        <select className="form-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                          <option value="Tagum City">Tagum City</option>
                          <option value="Carmen">Carmen</option>
                          <option value="Panabo City">Panabo City</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Passenger Type</label>
                        <select className="form-select" value={passengerType} onChange={(e) => setPassengerType(e.target.value)}>
                          <option value="Regular">Regular</option>
                          <option value="Student">Student (20% Off)</option>
                          <option value="Senior Citizen">Senior Citizen (20% Off)</option>
                          <option value="PWD">PWD (20% Off)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Fare amount (PHP)</label>
                        <input type="text" className="form-input-fare" value={`₱${getComputedFare().toFixed(2)}`} readOnly />
                      </div>

                      <button type="submit" className="btn-generate">Generate Ticket</button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* C. SCAN TICKET VIEW */}
          {activeTab === 'scan-ticket' && (
            <>
              <header className="top-header">
                <h3>Scan Ticket</h3>
              </header>

              <div className="scan-page-content">
                <div className="scanner-card">
                  <h4>Digital Fare / QR Scanner</h4>
                  <div 
                    id="scannerContainer" 
                    onClick={handleSimulateScan}
                    style={{ cursor: 'pointer', margin: '20px auto', textAlign: 'center' }}
                  >
                    <div className="qr-viewport">
                      <i className="fa-solid fa-qrcode qr-icon"></i>
                      <div className="scan-laser"></div>
                    </div>
                    <p className="scan-status-text" style={{ marginTop: '12px', fontWeight: 'bold', color: '#00897b' }}>
                      Ready To Scan
                    </p>
                    <small style={{ color: '#777' }}>(Click frame to validate QR)</small>
                  </div>
                </div>

                <div className="scanned-history-card">
                  <div className="scanned-card-header">
                    <h4>Scanned Tickets</h4>
                    <span className="scanned-date">Sep 1, 2026</span>
                  </div>

                  <div className="table-container">
                    <table className="breakdown-table">
                      <thead>
                        <tr>
                          <th>Ticket ID</th>
                          <th>Destination</th>
                          <th>Date / Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedTickets.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', color: '#888', padding: '24px' }}>
                              No tickets scanned yet
                            </td>
                          </tr>
                        ) : (
                          scannedTickets.map((t, idx) => (
                            <tr key={idx}>
                              <td>{t.id}</td>
                              <td>{t.destination}</td>
                              <td>{t.dateTime}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* D. END SHIFT VIEW */}
          {activeTab === 'end-shift' && (
            <>
              <header className="top-header end-shift-top-header">
                <h3>Shift Summary <span className="header-date">| Date: September 1, 2026</span></h3>
                <span className="chauffeur-id-badge">Chauffeur ID: CFR-2026-001</span>
              </header>

              <div className="end-shift-content">
                <div className="metrics-row">
                  <div className="metric-card-item">
                    <span className="m-label">Total Revenue:</span>
                    <span className="m-val highlight-revenue">₱{totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="metric-card-item">
                    <span className="m-label">Cash collected:</span>
                    <span className="m-val">₱{cashCollected.toFixed(2)}</span>
                  </div>
                  <div className="metric-card-item">
                    <span className="m-label">Digital Payments:</span>
                    <span className="m-val">₱{digitalPayments.toFixed(2)}</span>
                  </div>
                  <div className="metric-card-item">
                    <span>Total Passengers:</span>
                    <p className="metric-value">{totalPassengers}</p>
                  </div>
                </div>

                <div className="trip-breakdown-card">
                  <h3>Trip Breakdown</h3>
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th>Trip ID</th>
                        <th>Route</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>TRP-001</td>
                        <td>Davao City - Tagum City</td>
                        <td>--:--</td>
                        <td>--:--</td>
                        <td>₱{totalRevenue.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="end-shift-actions">
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleDownloadPDF}
                  >
                    Download Revenue Report
                  </button>

                  <button 
                    type="button" 
                    className="btn-verify-end-shift" 
                    onClick={handleVerifyEndShift}
                  >
                    VERIFY & END SHIFT
                  </button>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}